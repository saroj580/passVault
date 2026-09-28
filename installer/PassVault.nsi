; PassVault.nsi – NSIS installer script
; Requires NSIS 3.x  –  compile with: makensis installer\PassVault.nsi
; Run build.ps1 first so dist\electron-out\win-unpacked\ exists.

Unicode True

; ── Metadata ──────────────────────────────────────────────────────────────────
!define APP_NAME        "PassVault"
!define APP_VERSION     "1.0.0"
!define APP_PUBLISHER   "PassVault"
!define APP_EXE         "PassVault.exe"
!define INSTALL_DIR     "$PROGRAMFILES64\PassVault"
!define REG_KEY         "Software\Microsoft\Windows\CurrentVersion\Uninstall\PassVault"
!define SOURCE_DIR      "..\dist\electron-out\win-unpacked"
!define OUTPUT_DIR      "..\dist"

; ── Installer settings ────────────────────────────────────────────────────────
Name            "${APP_NAME} ${APP_VERSION}"
OutFile         "${OUTPUT_DIR}\PassVault-Setup.exe"
InstallDir      "${INSTALL_DIR}"
InstallDirRegKey HKLM "${REG_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor   /SOLID lzma
ShowInstDetails show
ShowUnInstDetails show

; ── Modern UI ─────────────────────────────────────────────────────────────────
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; ── Install section ───────────────────────────────────────────────────────────
Section "PassVault" SecMain

    SetOutPath "$INSTDIR"

    ; Copy everything from the electron-builder win-unpacked folder
    File /r "${SOURCE_DIR}\*.*"

    ; Create %APPDATA%\PassVault so the backend can write vault.db there
    CreateDirectory "$APPDATA\PassVault"

    ; Start-menu shortcut
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
                    "$INSTDIR\${APP_EXE}"
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" \
                    "$INSTDIR\Uninstall.exe"

    ; Desktop shortcut
    CreateShortcut  "$DESKTOP\${APP_NAME}.lnk" \
                    "$INSTDIR\${APP_EXE}"

    ; Write uninstall info to the registry (shows in "Apps & features")
    WriteRegStr   HKLM "${REG_KEY}" "DisplayName"          "${APP_NAME}"
    WriteRegStr   HKLM "${REG_KEY}" "DisplayVersion"       "${APP_VERSION}"
    WriteRegStr   HKLM "${REG_KEY}" "Publisher"            "${APP_PUBLISHER}"
    WriteRegStr   HKLM "${REG_KEY}" "InstallLocation"      "$INSTDIR"
    WriteRegStr   HKLM "${REG_KEY}" "UninstallString"      "$INSTDIR\Uninstall.exe"
    WriteRegDWORD HKLM "${REG_KEY}" "NoModify"             1
    WriteRegDWORD HKLM "${REG_KEY}" "NoRepair"             1

    WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd

; ── Uninstall section ─────────────────────────────────────────────────────────
Section "Uninstall"

    ; Kill the app if it is still running
    ExecWait 'taskkill /IM PassVault.exe /F' $0
    ExecWait 'taskkill /IM backend.exe /F'   $0
    Sleep 500

    ; Remove all installed files
    RMDir /r "$INSTDIR"

    ; Remove shortcuts
    RMDir /r "$SMPROGRAMS\${APP_NAME}"
    Delete    "$DESKTOP\${APP_NAME}.lnk"

    ; Remove registry key
    DeleteRegKey HKLM "${REG_KEY}"

    ; NOTE: %APPDATA%\PassVault (vault.db) is NOT removed on purpose.
    ;       User data survives uninstall.

SectionEnd
