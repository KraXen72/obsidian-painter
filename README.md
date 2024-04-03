# Painter
> Paint text different colors  
  
![minimal-menu](./screens/minimal-menu.png)  
![normal-menu](./screens/menu-normal.png)  
![commands](./screens/commands.png)

Inspired by my [css snippet & data.json](https://github.com/chetachiezikeuzor/Highlightr-Plugin/issues/61) to use Highlightr to change text color.  
The aim of this plugin is to support most features of [Highlightr-Plugin](https://github.com/chetachiezikeuzor/Highlightr-Plugin) as well as changing of the text color.  

## Improvements over original plugin
- smarter selection (adapted from [Smarter MD Hotkeys](https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys))
  - `inline code` signifies the part of the text being selected. `|` is a cursor without selection.
  - **auto-select word:** "hello t`|`here world!" => "hello `there` world!"
  - **trim selection to nearest word:** "what` is` up?" => "what `is` up?"
  - You are still able to paint a certain part of a word: "h`ell`o" => "h`ell`o"
- added `text-color` higlight option
- added `minimal` menu style - only show icons in one line
  - added `title` attributes to icons in menu (helps in minimal menu)		
- added `Clear` (formerly `Remove higlight`) to the menu as well
- removed a bunch of unnecessary code & styles, overall cleanup & rewrite
  - removed a bunch of custom icons in favor of normal obsidian icons	
  - removed `wait()` calls (promise + settimeout)	
- remove dependencies:
  - `pickr` - replaced with obsidian's native color picker & an alpha slider
- new svg icon (modified lucide highlighter icon)
- highlightr styles now use css variables instead of hardcoded values
- replaced regex-based eraseHighlight with a `DOMParser` approach
- added better dynamic highligt preview in settings
- renamed command ids for consistency
- clean up file structure & move to esbuild instead of rollup

## Support plugin development
If you find this Plugin helpful, consider it's further development or just say a small thank you
[![liberapay](https://liberapay.com/assets/widgets/donate.svg)](https://liberapay.com/KraXen72) [![kofi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/kraxen72)

## Credits
- [Highlightr-Plugin](https://github.com/chetachiezikeuzor/Highlightr-Plugin) released under [MPLv2](./LICENSE) license
  - for most of the original source code (most has been rewritten)
  - support: [ko-fi](https://ko-fi.com/chetachi)
- [Smarter MD Hotkeys](https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys) released under [MIT](https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys/blob/master/LICENSE) license 
  - for smart text modification logic
  - support: [ko-fi](https://ko-fi.com/pseudometa)

## TODO before release on Plugin Store
- [ ] two way binding for color inputs (editing input box updates color picker/slider)
- [x] fullly replace remaining innerHTML calls
  - don't worry, nothing sketchy is going on but it's a plugin guideline to not use `.innerHTML`. 
  - if unsure, you can check the source code for `innerHTML` usage
- [ ] allow editing of colors
- [ ] auto-generated classnames (maybe)
- [ ] replace remaining mentions of highlightr in code except for injected classnames
  - to be compatible with previously-highlighted notes by highlightr
  
## What this plugin doesen't try to be
This plugin is for coloring/highlighting text.  
It doesen't try to provide a comprehensive formatting toolbar/experience. 
Out of scope: [Modal highlighting (highlighting brushes)](https://github.com/chetachiezikeuzor/Highlightr-Plugin/issues/82)  
Use this: [obsidian-editing-toolbar](https://github.com/PKM-er/obsidian-editing-toolbar)  