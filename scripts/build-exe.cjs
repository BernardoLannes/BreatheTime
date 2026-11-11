const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const releaseBaseDir = path.join(rootDir, 'release');
const targetAppDir = path.join(releaseBaseDir, 'BreatheTime');
const resourcesAppDir = path.join(targetAppDir, 'resources', 'app');
const newExe = path.join(targetAppDir, 'BreatheTime.exe');

// Fecha instância aberta do BreatheTime.exe caso esteja rodando para atualizar limpo
try {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      'Stop-Process -Name "BreatheTime" -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 300',
    ],
    { stdio: 'ignore' }
  );
} catch {
  // ignore
}

if (!fs.existsSync(newExe)) {
  console.log('1. Preparando pasta do executável em:', targetAppDir);
  fs.mkdirSync(targetAppDir, { recursive: true });
  fs.cpSync(electronDistDir, targetAppDir, { recursive: true });

  const defaultAsar = path.join(targetAppDir, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultAsar)) {
    fs.rmSync(defaultAsar, { force: true });
  }

  const oldExe = path.join(targetAppDir, 'electron.exe');
  if (fs.existsSync(oldExe)) {
    fs.renameSync(oldExe, newExe);
  }
} else {
  console.log('1. Executável base já existe, atualizando pacote da aplicação...');
}

console.log('2. Empacotando código compilado (dist + electron) em resources/app...');
if (fs.existsSync(resourcesAppDir)) {
  fs.rmSync(resourcesAppDir, { recursive: true, force: true });
}
fs.mkdirSync(resourcesAppDir, { recursive: true });

fs.cpSync(path.join(rootDir, 'dist'), path.join(resourcesAppDir, 'dist'), {
  recursive: true,
});
fs.cpSync(
  path.join(rootDir, 'electron'),
  path.join(resourcesAppDir, 'electron'),
  { recursive: true }
);

const prodPkg = {
  name: 'breathe-time',
  productName: 'BreatheTime',
  version: '1.0.0',
  description: 'Gestão de Tempo Desktop para Bitrix24',
  main: 'electron/main.cjs',
};
fs.writeFileSync(
  path.join(resourcesAppDir, 'package.json'),
  JSON.stringify(prodPkg, null, 2),
  'utf-8'
);

const iconPath = path.join(resourcesAppDir, 'electron', 'icon.ico');
const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')

$ShortcutPaths = @(
  (Join-Path $DesktopPath 'BreatheTime.lnk'),
  (Join-Path '${rootDir.replace(/'/g, "''")}' 'BreatheTime.lnk')
)

foreach ($lnk in $ShortcutPaths) {
  $Shortcut = $WshShell.CreateShortcut($lnk)
  $Shortcut.TargetPath = '${newExe.replace(/'/g, "''")}'
  $Shortcut.WorkingDirectory = '${targetAppDir.replace(/'/g, "''")}'
  $Shortcut.IconLocation = '${iconPath.replace(/'/g, "''")},0'
  $Shortcut.Description = 'BreatheTime - Cronômetros de Tarefas para Bitrix24'
  $Shortcut.Save()
}
`;

execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
  stdio: 'inherit',
});

console.log('Concluído! Executável atualizado em:', newExe);
