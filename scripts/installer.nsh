; scripts/installer.nsh
; Custom NSIS script included by electron-builder
; Adds Arabic language support and branding to the installer

; ── Detect existing installation and warn ────────────────────────────────────
!macro customInit
  ; Check if app is already running
  FindWindow $0 "" "مدير عقاراتك"
  IntCmp $0 0 notRunning
    MessageBox MB_OK|MB_ICONEXCLAMATION \
      "يرجى إغلاق مدير عقاراتك قبل التثبيت.$\nPlease close the app before installing."
    Abort
  notRunning:
!macroend

; ── Post-install actions ─────────────────────────────────────────────────────
!macro customInstall
  ; Create data directories in AppData
  CreateDirectory "$APPDATA\modir-aqaratek\data\contracts"

  ; Write registry key for Windows "Apps & Features"
  WriteRegStr HKCU "Software\modir-aqaratek" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\modir-aqaratek" "Version"     "1.0.0"
!macroend

; ── Pre-uninstall cleanup ─────────────────────────────────────────────────────
!macro customUnInstall
  ; Remove registry entries
  DeleteRegKey HKCU "Software\modir-aqaratek"

  ; Ask user if they want to delete app data (database + contracts)
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "هل تريد حذف بيانات التطبيق (قاعدة البيانات والعقود)؟$\nDelete app data (database and contracts)?" \
    IDYES deleteData IDNO keepData
  deleteData:
    RMDir /r "$APPDATA\modir-aqaratek"
  keepData:
!macroend
