# 3. Windows Installer & Release Package Report

**Installer File**: `CampZen-Vendor-Setup-1.0.0.exe`  
**Target Platform**: Windows 10 & Windows 11 (64-bit)  
**Publisher**: WeCove.in  
**Status**: COMPILED & VERIFIED (PASS)  

---

## 1. Installer Specifications

- **File Name**: `CampZen-Vendor-Setup-1.0.0.exe`
- **File Size**: `147,968 bytes` (148 KB)
- **SHA-256 Checksum**:
  `DC99964AD46E9A9BEF218D8375F6711D08387217DEEB5253E6C2994052DD096E`
- **Installation Directory**: `%LocalAppData%\Programs\CampZenVendor\`
- **Embedded Visual Assets**: Official CampZen high-resolution multi-size `.ico` icon (16x16 through 256x256).

---

## 2. Installer Actions & System Integration

1. **Binary Extraction**: Installs `CampZenVendor.exe`, `src/` (HTML5/CSS/JS interface), `assets/`, and `agent/`.
2. **Desktop Shortcut**: Creates `CampZen Vendor.lnk` on the user's Desktop with custom icon.
3. **Start Menu Shortcut**: Registers `Programs\WeCove\CampZen Vendor.lnk`.
4. **Background Print Agent**: Automatically registers `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` entry pointing to `wscript.exe campzen-agent-service.vbs`.
5. **Windows Uninstall Registry**: Registers uninstaller under `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\CampZenVendor` enabling clean removal via Windows Settings / Control Panel.
