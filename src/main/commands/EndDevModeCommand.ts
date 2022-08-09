import * as vscode from "vscode";

import ICommand from "./ICommand";
import { END_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import messageBus from "../utils/messageBus";

export default class EndDevModeCommand implements ICommand {
  command: string = END_DEV_MODE;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }

  async execCommand(node: ControllerResourceNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    host.log(`${this.command} command executed!`, true);

    let result = "Yes";

    host.log("Get service config by running nhctl.getserviceconfig.", true);
    const svcProfile = await nhctl.getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );

    if (
      svcProfile?.possess === false &&
      svcProfile?.develop_status !== "STARTING"
    ) {
      result = await vscode.window.showInformationMessage(
        "This service is already in DevMode and you not the initiator, do you want exit the DevMode first?",
        { modal: true },
        "Yes",
        "No"
      );
    }

    if (result !== "Yes") {
      host.log("Yes, to not exit from dev mode.", true);
      return;
    }

    const appNode = node.getAppNode();
    host.getOutputChannel().show(true);
    const devSpace = appNode.getParent() as DevSpaceNode;
    host.disposeWorkload(devSpace.info.spaceName, appNode.name, node.name);

    host.log(`Emit endDevMode event from ${this.command} command`, true);

    messageBus.emit("endDevMode", {
      devSpaceName: devSpace.info.spaceName,
      appName: appNode.name,
      workloadName: node.name,
    });

    host.showProgressing("Ending dev mode...", async () => {
      host.log("Running nhctl.endDevMode command...", true);
      await nhctl.endDevMode(
        host,
        node.getKubeConfigPath(),
        node.getNameSpace(),
        appNode.name,
        node.name,
        node.resourceType
      );

      await node.setStatus("");
      await node.setContainer("");
      await node.getParent().updateData(false);
    });
  }
}
