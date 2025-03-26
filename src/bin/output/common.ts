import { VerbosityLogger } from "./types";
import { padEnd } from "../utils/text";
import slogans from "../../../workdocs/assets/slogans.json";
import { style } from "../utils/strings";

/**
 * @description Array of ANSI color codes for banner styling.
 * @summary Defines a set of ANSI color codes used to style the banner text.
 */
const colors = [
  "\x1b[38;5;215m", // soft orange
  "\x1b[38;5;209m", // coral
  "\x1b[38;5;205m", // pink
  "\x1b[38;5;210m", // peachy
  "\x1b[38;5;217m", // salmon
  "\x1b[38;5;216m", // light coral
  "\x1b[38;5;224m", // light peach
  "\x1b[38;5;230m", // soft cream
  "\x1b[38;5;230m"  // soft cream
];

/**
 * @description Prints a styled banner to the console.
 * @summary Generates and prints a colorful ASCII art banner with a random slogan.
 * @param {VerbosityLogger} [logger] - Optional logger for verbose output.
 * @function printBanner
 * @mermaid
 * sequenceDiagram
 *   participant printBanner
 *   participant getSlogan
 *   participant padEnd
 *   participant console
 *   printBanner->>getSlogan: Call getSlogan()
 *   getSlogan-->>printBanner: Return random slogan
 *   printBanner->>printBanner: Create banner ASCII art
 *   printBanner->>printBanner: Split banner into lines
 *   printBanner->>printBanner: Calculate max line length
 *   printBanner->>padEnd: Call padEnd with slogan
 *   padEnd-->>printBanner: Return padded slogan line
 *   loop For each banner line
 *     printBanner->>style: Call style(line)
 *     style-->>printBanner: Return styled line
 *     printBanner->>console: Log styled line
 *   end
 */
export function printBanner(logger?: VerbosityLogger){
  const message = getSlogan();
  const banner: string | string[] =`
#                 ░▒▓███████▓▒░  ░▒▓████████▓▒░  ░▒▓██████▓▒░   ░▒▓██████▓▒░  ░▒▓████████▓▒░       ░▒▓████████▓▒░  ░▒▓███████▓▒░ 
#      ( (        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓█▓▒░        
#       ) )       ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓█▓▒░        
#    [=======]    ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓██████▓▒░   ░▒▓█▓▒░        ░▒▓████████▓▒░ ░▒▓██████▓▒░            ░▒▓█▓▒░      ░▒▓██████▓▒░  
#     \`-----´     ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░            ░▒▓█▓▒░ 
#                 ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░            ░▒▓█▓▒░ 
#                 ░▒▓███████▓▒░  ░▒▓████████▓▒░  ░▒▓██████▓▒░  ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓███████▓▒░  
#                                                                                                                 
`.split("\n")
  const maxLength = banner.reduce((max, line) => Math.max(max, line.length), 0);
  banner.push(padEnd(` #  ${message}`, maxLength));
  banner.forEach((line, index) => {
    (logger ? logger.info.bind(logger) : console.log.bind(console))(style(line).raw(colors[index]));
  })
}

/**
 * @description Retrieves a slogan from the predefined list.
 * @summary Fetches a random slogan or a specific one by index from the slogans list.
 * @param {number} [i] - Optional index to retrieve a specific slogan.
 * @return {string} The selected slogan.
 * @function getSlogan
 * @mermaid
 * sequenceDiagram
 *   participant getSlogan
 *   participant Math.random
 *   participant slogans
 *   alt i is undefined
 *     getSlogan->>Math.random: Generate random index
 *     Math.random-->>getSlogan: Return random index
 *   else i is defined
 *     Note over getSlogan: Use provided index
 *   end
 *   getSlogan->>slogans: Access slogan at index
 *   slogans-->>getSlogan: Return slogan
 *   alt Error occurs
 *     getSlogan->>getSlogan: Throw error
 *   end
 *   getSlogan-->>Caller: Return slogan
 */
export function getSlogan(i?: number): string {
  try {
    i = typeof i === "undefined" ? Math.floor(Math.random() * slogans.length) : i;
    return slogans[i].Slogan;
  }  catch (error) {
    throw new Error("Failed to retrieve package information");
  }
}