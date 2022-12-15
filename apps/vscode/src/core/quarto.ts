/*
 * quarto.ts
 *
 * Copyright (C) 2022 by Posit Software, PBC
 *
 * Unless you have received this program directly from Posit Software pursuant
 * to the terms of a commercial license agreement with Posit Software, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */

import semver from "semver";

import { window, env, Uri } from "vscode";
import { QuartoContext } from "quarto-core";

export async function withMinimumQuartoVersion(
  context: QuartoContext,
  version: string,
  action: string,
  f: () => Promise<void>
) {
  if (context.available) {
    if (semver.gte(context.version, version)) {
      await f();
    } else {
      window.showWarningMessage(
        `${action} requires Quarto version ${version} or greater`,
        { modal: true }
      );
    }
  } else {
    await promptForQuartoInstallation(action);
  }
}

export async function promptForQuartoInstallation(context: string) {
  const installQuarto = { title: "Install Quarto" };
  const result = await window.showWarningMessage(
    "Quarto Installation Not Found",
    {
      modal: true,
      detail: `Please install the Quarto CLI before ${context.toLowerCase()}.`,
    },
    installQuarto
  );
  if (result === installQuarto) {
    env.openExternal(Uri.parse("https://quarto.org/docs/get-started/"));
  }
}
