import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FolderKanban,
  Trash2,
} from 'lucide-react';
import { Project, TaskItem, TimerDivision } from '../types/timer';
import { getDivisionElapsedMs, splitDuration } from '../utils/timeFormat';
import { TaskCard } from './TaskCard';

interface ProjectSectionProps {
  project: Project;
  tasks: TaskItem[];
  divisions: TimerDivision[];
  now: number;
  presetLabels: string[];
  onUpdatePresetLabels: (nextPresets: string[]) => void;
  onToggleExpandProject: (projectId: string) => void;
  onUpdateProjectName: (projectId: string, name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateTask: (projectId: string, title: string) => void;
  onToggleExpandTask: (taskId: string) => void;
  onUpdateTaskTitle: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, direction: 'up' | 'down') => void;
  onAddDivision: (taskId: string) => void;
  onTogglePlayDivision: (divisionId: string) => void;
  onUpdateDivisionLabel: (divisionId: string, label: string) => void;
  onUpdateDivisionDescription: (divisionId: string, description: string) => void;
  onAdjustDivisionTimeMs: (divisionId: string, deltaMs: number) => void;
  onSetDivisionManualTime: (divisionId: string, hours: number, minutes: number) => void;
  onCompleteDivision: (divisionId: string) => void;
  onDeleteDivision: (divisionId: string) => void;
  onCompleteAllTaskDivisions: (taskId: string) => void;
}

export const ProjectSection: React.FC<ProjectSectionProps> = ({
  project,
  tasks,
  divisions,
  now,
  presetLabels,
  onUpdatePresetLabels,
  onToggleExpandProject,
  onUpdateProjectName,
  onDeleteProject,
  onCreateTask,
  onToggleExpandTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onMoveTask,
  onAddDivision,
  onTogglePlayDivision,
  onUpdateDivisionLabel,
  onUpdateDivisionDescription,
  onAdjustDivisionTimeMs,
  onSetDivisionManualTime,
  onCompleteDivision,
  onDeleteDivision,
  onCompleteAllTaskDivisions,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  const projectTotalMs = divisions.reduce(
    (acc, div) => acc + getDivisionElapsedMs(div, now),
    0
  );
  const projectTime = splitDuration(projectTotalMs);
  const hasProjectContent = tasks.length > 0 || projectTotalMs > 0;

  const handleDeleteProjectClick = () => {
    if (!hasProjectContent || confirmDeleteProject) {
      onDeleteProject(project.id);
      return;
    }
    setConfirmDeleteProject(true);
    setTimeout(() => setConfirmDeleteProject(false), 3000);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    onCreateTask(project.id, trimmed);
    setNewTaskTitle('');
  };

  return (
    <section className="project-section">
      {/* Cabeçalho do Projeto */}
      <div
        className="project-header"
        style={{ borderLeftColor: project.color }}
      >
        <button
          type="button"
          className="collapse-btn"
          onClick={() => onToggleExpandProject(project.id)}
        >
          {project.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <span
          className="project-color-dot"
          style={{ backgroundColor: project.color }}
        />

        <input
          type="text"
          className="project-name-input"
          value={project.name}
          onChange={(e) => onUpdateProjectName(project.id, e.target.value)}
          placeholder="Nome do Projeto / Cliente..."
        />

        <span className="project-task-count" title="Quantidade de tarefas no projeto">
          <FolderKanban size={12} />
          {tasks.length}
        </span>

        <div className="project-total-time" title="Soma de todas as tarefas deste projeto">
          {projectTime.paddedHours}h {projectTime.paddedMinutes}m
        </div>

        <button
          type="button"
          className={`icon-action-btn danger ${confirmDeleteProject ? 'confirming-del' : ''}`}
          onClick={handleDeleteProjectClick}
          title={
            confirmDeleteProject
              ? 'Clique novamente para confirmar a exclusão do projeto e suas tarefas'
              : 'Excluir projeto'
          }
        >
          {confirmDeleteProject ? (
            <span className="confirm-del-txt">Excluir?</span>
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      </div>

      {/* Corpo do Projeto: Criação Rápida de Tarefa + Lista de Tarefas */}
      {project.isExpanded && (
        <div className="project-body">
          <form className="quick-add-task-form" onSubmit={handleAddTaskSubmit}>
            <input
              type="text"
              className="quick-add-task-input"
              placeholder="+ Nova tarefa neste projeto (Enter cria já com cronômetro pronto)..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button
              type="submit"
              className="quick-add-task-btn"
              disabled={!newTaskTitle.trim()}
            >
              <Plus size={14} />
              <span>Criar Tarefa</span>
            </button>
          </form>

          {tasks.length === 0 ? (
            <div className="empty-tasks-hint">
              Nenhuma tarefa ativa neste projeto. Digite acima para criar uma já pronta para dar Play!
            </div>
          ) : (
            <div className="tasks-list">
              {tasks.map((task, idx) => {
                const taskDivisions = divisions.filter((d) => d.taskId === task.id);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    divisions={taskDivisions}
                    now={now}
                    presetLabels={presetLabels}
                    onUpdatePresetLabels={onUpdatePresetLabels}
                    onToggleExpandTask={onToggleExpandTask}
                    onUpdateTaskTitle={onUpdateTaskTitle}
                    onDeleteTask={onDeleteTask}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < tasks.length - 1}
                    onMoveTask={onMoveTask}
                    onAddDivision={onAddDivision}
                    onTogglePlayDivision={onTogglePlayDivision}
                    onUpdateDivisionLabel={onUpdateDivisionLabel}
                    onUpdateDivisionDescription={onUpdateDivisionDescription}
                    onAdjustDivisionTimeMs={onAdjustDivisionTimeMs}
                    onSetDivisionManualTime={onSetDivisionManualTime}
                    onCompleteDivision={onCompleteDivision}
                    onDeleteDivision={onDeleteDivision}
                    onCompleteAllTaskDivisions={onCompleteAllTaskDivisions}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
