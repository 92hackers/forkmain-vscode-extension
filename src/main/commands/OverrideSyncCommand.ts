import * as vscode from "vscode";

import ICommand from "./ICommand";
import { Sync } from "./SyncServiceCommand";

import { OVERRIDE_SYNC } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";

export default class OverrideSyncCommand implements ICommand {
  command: string = OVERRIDE_SYNC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(syncData: Sync) {
    if (!syncData.app || !syncData.service) {
      return;
    }

    const result = await host.showInformationMessage(
      "Override the remote changes according to the local folders?",
      { modal: true },
      "Confirm"
    );
    if (result !== "Confirm") {
      return;
    }
    await nhctl.overrideSyncFolders(
      syncData.kubeConfigPath,
      syncData.namespace,
      syncData.app,
      syncData.service,
      syncData.resourceType
    );
  }
}
