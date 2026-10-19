# PM-web_v3

A personal engineering portfolio presented as a desktop workspace. Its desktop composition follows the Windows 11-inspired [Win11React reference](https://github.com/blueedgetechno/win11React) more closely: centered Acrylic/Mica taskbar, a centered Start menu with Pinned, All apps, Recommended, and profile/footer areas, and a small left-aligned desktop. Wallpaper and portfolio identity remain original. The desktop intentionally contains exactly one project folder and one readme file.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current desktop interactions

- Select **Selected work** or **Read Me.txt** on the desktop to open its window.
- Use the two app buttons on the taskbar to open or minimize those windows.
- Open Start for the same destinations; **All apps** switches to the complete app list and **Recommended / More** opens that list too.
- Use the Start footer appearance control to switch between light and dark themes.
- Press **Escape** to dismiss Start or close an open window.

## Icons

The local SVG assets in `public/icons/thesvg/` are sourced from [theSVG](https://thesvg.org/): Windows 11, Azure Folder Blank, Azure File, Files, and Notepad++. Generic interface controls use Lucide icons. Keeping SVGs local means the desktop preview does not depend on external icon requests.

The project and profile content is intentionally minimal at this stage; the folder is a starting point for adding verified portfolio content in later steps.
