# Painter
> Paint text different colors  
  
![minimal-menu](./screens/minimal-menu.png)  
![normal-menu](./screens/menu-normal.png)  
![commands](./screens/commands.png)

Rewrite/fork of [Highlightr-Plugin](https://github.com/chetachiezikeuzor/Highlightr-Plugin), utilizing a lot of it's code - credit to @chetachiezikeuzor
Inspired by my [css snippet & data.json](https://github.com/chetachiezikeuzor/Highlightr-Plugin/issues/61) to use Highlightr to change text color.

The aim of this plugin is to support most features of [Highlightr-Plugin](https://github.com/chetachiezikeuzor/Highlightr-Plugin) as well as changing of the text color

## Improvements over original plugins
- clean up file structure & move to esbuild instead of rollup
- removed a bunch of unnecessary code & styles, overall cleanup & rewrite
  - removed a bunch of custom icons in favor of normal obsidian icons	
  - removed `wait()` calls (promise + settimeout)	
- remove dependencies:
  - `sortablejs` - replaced with up/down buttons
  - `pickr` - replaced with obsidian's native color picker & an alpha slider
- new svg icon (modified lucide highlighter icon)
- renamed command ids for consistency
- highlightr styles now use css variables instead of hardcoded values
- replaced regex-based eraseHighlight with a `DOMParser` approach
- added `text-color` higlight option
- added `minimal` menu style - only show icons in one line
  - added `title` attributes to icons in menu (helps in minimal menu)		
- added `Clear color` (formerly remove higlight) to the menu as well
- added better dynamic highligt preview in settings (for now uses innerHTML, will be changed later.)

## TODO before release on Plugin Store
- [ ] two way binding for color inputs (editing input box updates color picker/slider)
- [ ] fullly replace remaining innerHTML calls
  - don't worry, nothing sketchy is going on but it's a plugin guideline to not use `.innerHTML`. 
  - if unsure, you can check the source code for `innerHTML` usage
- [ ] allow editing of colors
- [ ] auto-generated classnames (maybe)
- [ ] replace remaining mentions of highlightr in code except for injected classnames
  - to be compatible with previously-highlighted notes by highlightr