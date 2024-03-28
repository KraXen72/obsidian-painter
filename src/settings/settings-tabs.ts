import type HighlightrPlugin from "../main";
import {
	App,
	Setting,
	PluginSettingTab,
	Notice,
	TextComponent,
	ColorComponent,
} from "obsidian";
import { HIGHLIGHTER_METHODS, HIGHLIGHTER_STYLES } from "./settings-data";

export class HighlightrSettingTab extends PluginSettingTab {
	plugin: HighlightrPlugin;
	appendMethod: string;

	constructor(app: App, plugin: HighlightrPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h1", { text: "Highlightr" });
		containerEl.createEl("p", { text: "Created by " }).createEl("a", {
			text: "Chetachi 👩🏽‍💻",
			href: "https://github.com/chetachiezikeuzor",
		});
		containerEl.createEl("h2", { text: "Plugin Settings" });

		new Setting(containerEl)
			.setName("Choose highlight method")
			.setDesc(
				`Choose between highlighting with inline CSS or CSS classes. Please note that there are pros and cons to both choices. Inline CSS will keep you from being reliant on external CSS files if you choose to export your notes. CSS classes are more flexible and easier to customize.`
			)
			.addDropdown((dropdown) => {
				let methods: Record<string, string> = {};
				HIGHLIGHTER_METHODS.map((method) => (methods[method] = method));
				dropdown.addOptions(methods);
				dropdown
					.setValue(this.plugin.settings.highlighterMethods)
					.onChange((highlightrMethod) => {
						this.plugin.settings.highlighterMethods = highlightrMethod;
						setTimeout(() => {
							dispatchEvent(new Event("Highlightr-NewCommand"));
						}, 100);
						this.plugin.saveSettings();
						this.plugin.saveData(this.plugin.settings);
						this.display();
					});
			});

		const stylesSetting = new Setting(containerEl);

		stylesSetting
			.setName("Choose highlight style")
			.setDesc(
				`Depending on your design aesthetic, you may want to customize the style of your highlights. Choose from an assortment of different highlighter styles by using the dropdown. Depending on your theme, this plugin's CSS may be overriden.`
			)
			.addDropdown((dropdown) => {
				let styles: Record<string, string> = {};
				HIGHLIGHTER_STYLES.map((style) => (styles[style] = style));
				dropdown.addOptions(styles);
				dropdown
					.setValue(this.plugin.settings.highlighterStyle)
					.onChange((highlighterStyle) => {
						this.plugin.settings.highlighterStyle = highlighterStyle;
						this.plugin.saveSettings();
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});

		const styleDemo = () => {
			const d = createEl("p");
			d.setAttribute("style", "font-size: .925em; margin-top: 12px;");
			d.innerHTML = `
			<span style="background:#FFB7EACC;padding: .125em .125em;--lowlight-background: var(--background-primary);border-radius: 0;background-image: linear-gradient(360deg,rgba(255, 255, 255, 0) 40%,var(--lowlight-background) 40%) !important;">Lowlight</span> 
			<span style="background:#93C0FFCC;--floating-background: var(--background-primary);border-radius: 0;padding-bottom: 5px;background-image: linear-gradient(360deg,rgba(255, 255, 255, 0) 28%,var(--floating-background) 28%) !important;">Floating</span> 
			<span style="background:#9CF09CCC;margin: 0 -0.05em;padding: 0.1em 0.4em;border-radius: 0.8em 0.3em;-webkit-box-decoration-break: clone;box-decoration-break: clone;text-shadow: 0 0 0.75em var(--background-primary-alt);">Realistic</span> 
			<span style="background:#CCA9FFCC;margin: 0 -0.05em;padding: 0.125em 0.15em;border-radius: 0.2em;-webkit-box-decoration-break: clone;box-decoration-break: clone;">Rounded</span>`;
			return d;
		};

		stylesSetting.infoEl.appendChild(styleDemo());

		const highlighterSetting = new Setting(containerEl);

		highlighterSetting
			.setName("Choose highlight colors")
			.setClass("highlighterplugin-setting-item")
			.setDesc(
				`Create new highlight colors by providing a color name and using the color picker to set the hex code value. Don't forget to save the color before exiting the color picker. Drag and drop the highlight color to change the order for your highlighter component.`
			);
		highlighterSetting.controlEl.setCssStyles({
			'alignItems': 'center'
		})

		const colorNameInput = new TextComponent(highlighterSetting.controlEl);
		colorNameInput.setPlaceholder("Color name");
		colorNameInput.inputEl.addClass("highlighter-settings-color");

		const colorValueInput = new TextComponent(highlighterSetting.controlEl)
			.setPlaceholder("Color HEX: Click off color picker to update")

		colorValueInput.inputEl.addClass("highlighter-settings-value");


		// const colorColorInput = createEl('input', { type: 'color' })


		highlighterSetting
			.addColorPicker((cb: ColorComponent & { colorPickerEl: HTMLInputElement }) => {
				cb.setValue('#CCA9FF')
				cb.colorPickerEl.addEventListener('input', (e) => {
					if (e.target === null) return;
					const et = e.target as HTMLInputElement
					colorValueInput.setValue(et.value)
				})
			})
			.addSlider(cb => {
				cb.setLimits(0, 255, 1)
				cb.setValue(255)
				cb.sliderEl.title = 'Alpha / opacity'
				cb.onChange(val => {
					cb.showTooltip()
					console.log(val)
				})
			})
			.addButton((button) => {
				button
					.setClass("HighlightrSettingsButton")
					.setClass("HighlightrSettingsButtonAdd")
					.setIcon("save")
					.setTooltip("Save")
					.onClick(async (buttonEl: any) => {
						let color = colorNameInput.inputEl.value.replace(" ", "-");
						let value = colorValueInput.inputEl.value;

						if (color && value) {
							if (!this.plugin.settings.orderedColors.includes(color)) {
								this.plugin.settings.orderedColors.push(color);
								this.plugin.settings.highlighters[color] = value;
								setTimeout(() => {
									dispatchEvent(new Event("Highlightr-NewCommand"));
								}, 100);
								await this.plugin.saveSettings();
								this.display();
							} else {
								buttonEl.stopImmediatePropagation();
								new Notice("This color already exists");
							}
						}
						color && !value
							? new Notice("Highlighter hex code missing")
							: !color && value
								? new Notice("Highlighter name missing")
								: new Notice("Highlighter values missing"); // else
					});
			})

		const highlightersContainer = containerEl.createEl("div", {
			cls: "HighlightrSettingsTabsContainer",
		});

		const reorderColor = (oldIndex: number, newIndex: number) => {
			if (newIndex < 0) return;
			const arrayResult = this.plugin.settings.orderedColors;
			const [removed] = arrayResult.splice(oldIndex, 1);
			arrayResult.splice(newIndex, 0, removed);
			this.plugin.settings.orderedColors = arrayResult;
			this.plugin.saveSettings();
		}

		this.plugin.settings.orderedColors.forEach((highlighter, index, arr) => {
			const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${this.plugin.settings.highlighters[highlighter]} stroke=${this.plugin.settings.highlighters[highlighter]} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
			const settingItem = highlightersContainer.createEl("div");
			settingItem.addClass("highlighter-item-color");
			const colorIcon = settingItem.createEl("span");
			colorIcon.addClass("highlighter-setting-icon");
			colorIcon.innerHTML = icon;

			new Setting(settingItem)
				.setClass("highlighter-setting-item")
				.setName(highlighter)
				.setDesc(this.plugin.settings.highlighters[highlighter])
				.addButton(button => {
					button
						.setClass("HighlightrSettingsButton")
						.setClass("HighlightrSettingsMoveUp")
						.setTooltip("Move up")
						.setIcon("chevron-up")
						.onClick(() => {
							reorderColor(index, index - 1)
							this.display();
						})
					if (index === 0) button.setDisabled(true)
				})
				.addButton(button => {
					button
						.setClass("HighlightrSettingsButton")
						.setClass("HighlightrSettingsMoveDown")
						.setTooltip("Move down")
						.setIcon("chevron-down")
						.onClick(() => {
							reorderColor(index, index + 1)
							this.display();
						})
					if (index === arr.length - 1) button.setDisabled(true)
				})
				.addButton((button) => {
					button
						.setClass("HighlightrSettingsButton")
						.setClass("HighlightrSettingsButtonDelete")
						.setIcon("trash-2")
						.setTooltip("Remove")
						.onClick(async () => {
							new Notice(`${highlighter} highlight deleted`);
							(this.app as any).commands.removeCommand(
								`highlightr-plugin:${highlighter}`
							);
							delete this.plugin.settings.highlighters[highlighter];
							this.plugin.settings.orderedColors.remove(highlighter);
							setTimeout(() => {
								dispatchEvent(new Event("Highlightr-NewCommand"));
							}, 100);
							await this.plugin.saveSettings();
							this.display();
						});
				})

			const a = createEl("a");
			a.setAttribute("href", "");
		});
	}
}
