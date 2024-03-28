import type HighlightrPlugin from "./main";
import { Menu } from "obsidian";
import { HighlightrSettings } from "./settings/settings-data";
import highlighterMenu from "./menu";
import type { EnhancedApp, EnhancedEditor } from "./settings/settings-types";

export default function contextMenu(
  app: EnhancedApp,
  menu: Menu,
  editor: EnhancedEditor,
  plugin: HighlightrPlugin,
  settings: HighlightrSettings
): void {
  const selection = editor.getSelection();

  menu.addItem((item) => {
    const itemDom = (item as any).dom as HTMLElement;
    itemDom.addClass("highlighter-button");
    item
      .setTitle("Highlight")
      .setIcon("highlightr-pen")
      .onClick(async (e) => {
        highlighterMenu(app, settings, editor);
      });
  });

  if (selection) {
    menu.addItem((item) => {
      item
        .setTitle("Erase highlight")
        .setIcon("highlightr-eraser")
        .onClick((e) => {
          if (editor.getSelection()) {
            plugin.eraseHighlight(editor);
          }
        });
    });
  }
}
