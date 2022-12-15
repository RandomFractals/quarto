/*
 * markdownit-yaml.ts
 *
 * Copyright (C) 2022 by Posit Software, PBC
 * Copyright (c) 2016-2020 ParkSB.
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

import MarkdownIt from "markdown-it";
import StateBlock from "markdown-it/lib/rules_block/state_block";

// Typescript version of https://github.com/parksb/markdown-it-front-matter

export function markdownitFrontMatterPlugin(md: MarkdownIt, cb?: (yaml: unknown) => void) {
  const min_markers = 3,
    marker_str = "-",
    marker_char = marker_str.charCodeAt(0),
    marker_len = marker_str.length;

  function frontMatter(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
  ) {
    let pos,
      nextLine,
      start_content,
      auto_closed = false,
      start = state.bMarks[startLine] + state.tShift[startLine],
      max = state.eMarks[startLine];

    // Check out the first character of the first line quickly,
    // this should filter out non-front matter
    if (startLine !== 0 || marker_char !== state.src.charCodeAt(0)) {
      return false;
    }

    // Check out the rest of the marker string
    // while pos <= 3
    for (pos = start + 1; pos <= max; pos++) {
      if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
        start_content = pos + 1;
        break;
      }
    }

    const marker_count = Math.floor((pos - start) / marker_len);

    if (marker_count < min_markers) {
      return false;
    }
    pos -= (pos - start) % marker_len;

    // Since start is found, we can report success here in validation mode
    if (silent) {
      return true;
    }

    // Search for the end of the block
    nextLine = startLine;

    for (;;) {
      nextLine++;
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }

      if (state.src.slice(start, max) === "...") {
        break;
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break;
      }

      if (marker_char !== state.src.charCodeAt(start)) {
        continue;
      }

      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        // closing fence should be indented less than 4 spaces
        continue;
      }

      for (pos = start + 1; pos <= max; pos++) {
        if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
          break;
        }
      }

      // closing code fence must be at least as long as the opening one
      if (Math.floor((pos - start) / marker_len) < marker_count) {
        continue;
      }

      // make sure tail has spaces only
      pos -= (pos - start) % marker_len;
      pos = state.skipSpaces(pos);

      if (pos < max) {
        continue;
      }

      // found!
      auto_closed = true;
      break;
    }

    const old_parent = state.parentType;
    const old_line_max = state.lineMax;
    state.parentType = "root";

    // this will prevent lazy continuations from ever going past our end marker
    state.lineMax = nextLine;

    const token = state.push("front_matter", "", 0);
    token.hidden = true;
    token.markup = state.src.slice(startLine, pos);
    token.block = true;
    token.map = [startLine, pos];
    token.meta = state.src.slice(start_content, start - 1);

    state.parentType = old_parent;
    state.lineMax = old_line_max;
    state.line = nextLine + (auto_closed ? 1 : 0);

    if (cb) {
      cb(token.meta);
    }

    return true;
  }

  md.block.ruler.before("table", "front_matter", frontMatter, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
}
