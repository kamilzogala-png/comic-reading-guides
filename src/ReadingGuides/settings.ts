import {
  ButtonRow,
  Form,
  InputRow,
  LabelRow,
  Section,
  ToggleRow,
  type FormSectionElement,
} from "@paperback/types";
import { readSettings } from "./config";
import { KomgaProvider } from "./komga";
import { httpGetJson } from "./network";
import { resetMatcherCache } from "./library";
import { resetGuidesCache } from "./guides";
import { guideStore } from "./storage";

export class SettingsForm extends Form {
  private status = "Nie sprawdzono";
  private guidesStatus = "";

  override getSections(): FormSectionElement<unknown>[] {
    const s = readSettings();
    return [
      Section(
        {
          id: "server",
          header: "Biblioteka Komga",
          footer:
            "Adres z portem, np. http://192.168.1.10:25600. Klucz API: Komga → Account Settings → API Keys.",
        },
        [
          ToggleRow("linkLibrary", {
            title: "Połącz z moją biblioteką",
            value: s.linkLibrary,
            onValueChange: Application.Selector(this as SettingsForm, "onLinkChange"),
          }),
          InputRow("serverUrl", {
            title: "Adres serwera",
            value: s.serverUrl,
            onValueChange: Application.Selector(this as SettingsForm, "onServerUrlChange"),
          }),
          ToggleRow("useApiKey", {
            title: "Logowanie kluczem API",
            subtitle: "Wyłącz, aby użyć loginu i hasła",
            value: s.useApiKey,
            onValueChange: Application.Selector(this as SettingsForm, "onUseApiKeyChange"),
          }),
          InputRow("apiKey", {
            title: "Klucz API",
            value: s.apiKey,
            isSecureEntry: true,
            isHidden: !s.useApiKey,
            onValueChange: Application.Selector(this as SettingsForm, "onApiKeyChange"),
          }),
          InputRow("username", {
            title: "Login",
            value: s.username,
            isHidden: s.useApiKey,
            onValueChange: Application.Selector(this as SettingsForm, "onUsernameChange"),
          }),
          InputRow("password", {
            title: "Hasło",
            value: s.password,
            isSecureEntry: true,
            isHidden: s.useApiKey,
            onValueChange: Application.Selector(this as SettingsForm, "onPasswordChange"),
          }),
          ButtonRow("testConnection", {
            title: "Sprawdź połączenie",
            onSelect: Application.Selector(this as SettingsForm, "testConnection"),
          }),
          LabelRow("status", { title: "Status", value: this.status }),
        ],
      ),
      Section(
        {
          id: "guides",
          header: "Przewodniki",
          footer: "Domyślnie lista pobierana jest z repozytorium projektu i odświeżana co kilka godzin.",
        },
        [
          InputRow("guidesUrl", {
            title: "Adres guides.json",
            value: s.guidesUrl,
            onValueChange: Application.Selector(this as SettingsForm, "onGuidesUrlChange"),
          }),
          ButtonRow("refreshGuides", {
            title: "Odśwież przewodniki i dopasowania",
            onSelect: Application.Selector(this as SettingsForm, "refreshGuides"),
          }),
          LabelRow("guidesStatus", { title: "Ostatnia akcja", value: this.guidesStatus || "—" }),
        ],
      ),
    ];
  }

  async onLinkChange(value: boolean): Promise<void> {
    Application.setState(value, "linkLibrary");
    resetMatcherCache();
    this.reloadForm();
  }
  async onServerUrlChange(value: string): Promise<void> {
    Application.setState(value, "serverUrl");
    resetMatcherCache();
  }
  async onUseApiKeyChange(value: boolean): Promise<void> {
    Application.setState(value, "useApiKey");
    resetMatcherCache();
    this.reloadForm();
  }
  async onApiKeyChange(value: string): Promise<void> {
    Application.setSecureState(value.trim(), "apiKey");
    resetMatcherCache();
  }
  async onUsernameChange(value: string): Promise<void> {
    Application.setState(value.trim(), "username");
    resetMatcherCache();
  }
  async onPasswordChange(value: string): Promise<void> {
    Application.setSecureState(value, "password");
    resetMatcherCache();
  }
  async onGuidesUrlChange(value: string): Promise<void> {
    Application.setState(value.trim(), "guidesUrl");
    resetGuidesCache(guideStore);
  }

  async testConnection(): Promise<void> {
    const s = readSettings();
    if (!s.serverUrl) {
      this.status = "Podaj adres serwera";
    } else {
      this.status = "Łączenie…";
      this.reloadForm();
      try {
        this.status = await new KomgaProvider(s.serverUrl, httpGetJson).testConnection();
      } catch (error) {
        this.status = `Błąd: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    this.reloadForm();
  }

  async refreshGuides(): Promise<void> {
    resetGuidesCache(guideStore);
    resetMatcherCache();
    this.guidesStatus = "Wyczyszczono pamięć podręczną — odśwież widok przewodnika";
    this.reloadForm();
  }
}
