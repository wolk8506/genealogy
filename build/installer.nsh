# Builds before 1.12.2 used the default oneClick installer, which installs into
# a folder named after package.json "name" (genealogy-react). Windows keeps that
# folder in Software\<APP_GUID>\InstallLocation and every later installer reuses
# it, so the old name outlives the config change.
!macro customInit
  Push $0
  Push $1
  Push $2
  Push $3

  StrLen $1 "genealogy-react"
  StrLen $2 "$INSTDIR"
  IntOp $3 $2 - $1
  StrCpy $0 "$INSTDIR" "" $3
  StrCmp $0 "genealogy-react" 0 genealogy_legacy_dir_done

  StrCpy $0 "$INSTDIR" $3
  StrCpy $INSTDIR "$0${APP_FILENAME}"
  # The installer pages re-read InstallLocation after this macro, so the stale
  # value has to be removed, not just ignored.
  DeleteRegValue HKCU "Software\${APP_GUID}" "InstallLocation"
  DeleteRegValue HKLM "Software\${APP_GUID}" "InstallLocation"

genealogy_legacy_dir_done:
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend
