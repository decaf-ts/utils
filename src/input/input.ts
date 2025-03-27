import prompts, { Answers, Choice, Falsy, InitialReturnValue, PrevCaller, PromptObject, PromptType, ValueOrFunc } from "prompts";
import { parseArgs, ParseArgsConfig } from "util";
import { Writable, Readable } from "stream";
import { Logging } from "../output/logging";
import { Kleur } from "../output/types";
import { ParseArgsOptionsConfig, ParseArgsResult } from "./types";

/**
 * @description Represents a user input prompt with various configuration options.
 * @summary This class provides a flexible interface for creating and managing user input prompts.
 * It implements the PromptObject interface from the 'prompts' library and offers methods to set
 * various properties of the prompt. The class also includes static methods for common input scenarios
 * and argument parsing.
 * 
 * @template R - The type of the prompt name, extending string.
 * 
 * @param name - The name of the prompt, used as the key in the returned answers object.
 * 
 * @class
 */
export class UserInput<R extends string = string> implements PromptObject<R> {

  private static readonly logger = Logging.for(UserInput);
  /**
   * @description The type of the prompt.
   * @summary Determines the input method (e.g., text, number, confirm).
   */
  type: PromptType | Falsy | PrevCaller<R, PromptType | Falsy> = "text"

  /**
   * @description The name of the prompt.
   * @summary Used as the key in the returned answers object.
   */
  name: ValueOrFunc<R>;

  /**
   * @description The message displayed to the user.
   * @summary The question or instruction presented to the user.
   */
  message?: ValueOrFunc<string> | undefined;

  /**
   * @description The initial value of the prompt.
   * @summary The default value presented to the user.
   */
  initial?: InitialReturnValue | PrevCaller<R, InitialReturnValue | Promise<InitialReturnValue>> | undefined;

  /**
   * @description The style of the prompt.
   * @summary Determines the visual style of the prompt.
   */
  style?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The format function for the input.
   * @summary A function to format the user's input before it's returned.
   */
  format?: PrevCaller<R, void> | undefined;

  /**
   * @description The validation function for the input.
   * @summary A function to validate the user's input.
   */
  validate?: PrevCaller<R, boolean | string | Promise<boolean | string>> | undefined;

  /**
   * @description The onState callback function.
   * @summary A function called when the state of the prompt changes.
   */
  onState?: PrevCaller<R, void> | undefined;

  /**
   * @description The onRender callback function.
   * @summary A function called when the prompt is rendered.
   */
  onRender?: ((kleur: Kleur) => void) | undefined;

  /**
   * @description The minimum value for number inputs.
   * @summary The lowest number the user can input.
   */
  min?: number | PrevCaller<R, number | Falsy> | undefined;

  /**
   * @description The maximum value for number inputs.
   * @summary The highest number the user can input.
   */
  max?: number | PrevCaller<R, number | Falsy> | undefined;

  /**
   * @description Whether to allow float values for number inputs.
   * @summary If true, allows decimal numbers.
   */
  float?: boolean | PrevCaller<R, boolean | Falsy> | undefined;

  /**
   * @description The number of decimal places to round to for float inputs.
   * @summary Determines the precision of float inputs.
   */
  round?: number | PrevCaller<R, number | Falsy> | undefined;

  /**
   * @description Instructions for the user.
   * @summary Additional guidance provided to the user.
   */
  instructions?: string | boolean | undefined;

  /**
   * @description The increment value for number inputs.
   * @summary The step size when increasing or decreasing the number.
   */
  increment?: number | PrevCaller<R, number | Falsy> | undefined;

  /**
   * @description The separator for list inputs.
   * @summary The character used to separate list items.
   */
  separator?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The active option style for select inputs.
   * @summary The style applied to the currently selected option.
   */
  active?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The inactive option style for select inputs.
   * @summary The style applied to non-selected options.
   */
  inactive?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The choices for select inputs.
   * @summary The list of options presented to the user.
   */
  choices?: Choice[] | PrevCaller<R, Choice[] | Falsy> | undefined;

  /**
   * @description The hint text for the prompt.
   * @summary Additional information displayed to the user.
   */
  hint?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The warning text for the prompt.
   * @summary A warning message displayed to the user.
   */
  warn?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The suggest function for autocomplete inputs.
   * @summary A function to provide suggestions based on user input.
   */
  suggest?: ((input: any, choices: Choice[]) => Promise<any>) | undefined;

  /**
   * @description The limit for list inputs.
   * @summary The maximum number of items that can be selected.
   */
  limit?: number | PrevCaller<R, number | Falsy> | undefined;

  /**
   * @description The mask for password inputs.
   * @summary The character used to hide the user's input.
   */
  mask?: string | PrevCaller<R, string | Falsy> | undefined;

  /**
   * @description The stdout stream for the prompt.
   * @summary The output stream used by the prompt.
   */
  stdout?: Writable | undefined;

  /**
   * @description The stdin stream for the prompt.
   * @summary The input stream used by the prompt.
   */
  stdin?: Readable | undefined;

  /**
   * @description Creates a new UserInput instance.
   * @summary Initializes a new UserInput object with the given name.
   * 
   * @param name - The name of the prompt.
   */
  constructor(name: ValueOrFunc<R>) {
    this.name = name
  }

  /**
   * @description Sets the type of the prompt.
   * @summary Configures the input method for the prompt.
   *
   * @param type - The type of the prompt.
   * @returns This UserInput instance for method chaining.
   */
  setType(type: PromptType | Falsy | PrevCaller<R, PromptType | Falsy>): this {
    UserInput.logger.verbose(`Setting type to: ${type}`);
    this.type = type;
    return this;
  }

  /**
   * @description Sets the message of the prompt.
   * @summary Configures the question or instruction presented to the user.
   *
   * @param value - The message to be displayed.
   * @returns This UserInput instance for method chaining.
   */
  setMessage(value: ValueOrFunc<string> | undefined): this {
    UserInput.logger.verbose(`Setting message to: ${value}`);
    this.message = value;
    return this;
  }

  /**
   * @description Sets the initial value of the prompt.
   * @summary Configures the default value presented to the user.
   *
   * @param value - The initial value.
   * @returns This UserInput instance for method chaining.
   */
  setInitial(value: InitialReturnValue | PrevCaller<R, InitialReturnValue | Promise<InitialReturnValue>> | undefined): this {
    UserInput.logger.verbose(`Setting initial value to: ${value}`);
    this.initial = value;
    return this;
  }

  /**
   * @description Sets the style of the prompt.
   * @summary Configures the visual style of the prompt.
   *
   * @param value - The style to be applied.
   * @returns This UserInput instance for method chaining.
   */
  setStyle(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting style to: ${value}`);
    this.style = value;
    return this;
  }

  /**
   * @description Sets the format function of the prompt.
   * @summary Configures a function to format the user's input before it's returned.
   *
   * @param value - The format function.
   * @returns This UserInput instance for method chaining.
   */
  setFormat(value: PrevCaller<R, void> | undefined): this {
    UserInput.logger.verbose(`Setting format function`);
    this.format = value;
    return this;
  }

  /**
   * @description Sets the validation function of the prompt.
   * @summary Configures a function to validate the user's input.
   *
   * @param value - The validation function.
   * @returns This UserInput instance for method chaining.
   */
  setValidate(value: PrevCaller<R, boolean | string | Promise<boolean | string>> | undefined): this {
    UserInput.logger.verbose(`Setting validate function`);
    this.validate = value;
    return this;
  }

  /**
   * @description Sets the onState callback of the prompt.
   * @summary Configures a function to be called when the state of the prompt changes.
   *
   * @param value - The onState callback function.
   * @returns This UserInput instance for method chaining.
   */
  setOnState(value: PrevCaller<R, void> | undefined): this {
    UserInput.logger.verbose(`Setting onState callback`);
    this.onState = value;
    return this;
  }

  /**
   * @description Sets the onRender callback of the prompt.
   * @summary Configures a function to be called when the prompt is rendered.
   *
   * @param value - The onRender callback function.
   * @returns This UserInput instance for method chaining.
   */
  setOnRender(value: ((kleur: Kleur) => void) | undefined): this {
    UserInput.logger.verbose(`Setting onRender callback`);
    this.onRender = value;
    return this;
  }

  /**
   * @description Sets the minimum value for number inputs.
   * @summary Configures the lowest number the user can input.
   *
   * @param value - The minimum value.
   * @returns This UserInput instance for method chaining.
   */
  setMin(value: number | PrevCaller<R, number | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting min value to: ${value}`);
    this.min = value;
    return this;
  }

  /**
   * @description Sets the maximum value for number inputs.
   * @summary Configures the highest number the user can input.
   *
   * @param value - The maximum value.
   * @returns This UserInput instance for method chaining.
   */
  setMax(value: number | PrevCaller<R, number | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting max value to: ${value}`);
    this.max = value;
    return this;
  }

  /**
   * @description Sets whether to allow float values for number inputs.
   * @summary Configures whether decimal numbers are allowed.
   *
   * @param value - Whether to allow float values.
   * @returns This UserInput instance for method chaining.
   */
  setFloat(value: boolean | PrevCaller<R, boolean | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting float to: ${value}`);
    this.float = value;
    return this;
  }

  /**
   * @description Sets the number of decimal places to round to for float inputs.
   * @summary Configures the precision of float inputs.
   *
   * @param value - The number of decimal places.
   * @returns This UserInput instance for method chaining.
   */
  setRound(value: number | PrevCaller<R, number | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting round to: ${value}`);
    this.round = value;
    return this;
  }

  /**
   * @description Sets the instructions for the user.
   * @summary Configures additional guidance provided to the user.
   *
   * @param value - The instructions.
   * @returns This UserInput instance for method chaining.
   */
  setInstructions(value: string | boolean | undefined): this {
    UserInput.logger.verbose(`Setting instructions to: ${value}`);
    this.instructions = value;
    return this;
  }

  /**
   * @description Sets the increment value for number inputs.
   * @summary Configures the step size when increasing or decreasing the number.
   *
   * @param value - The increment value.
   * @returns This UserInput instance for method chaining.
   */
  setIncrement(value: number | PrevCaller<R, number | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting increment to: ${value}`);
    this.increment = value;
    return this;
  }

  /**
   * @description Sets the separator for list inputs.
   * @summary Configures the character used to separate list items.
   *
   * @param value - The separator character.
   * @returns This UserInput instance for method chaining.
   */
  setSeparator(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting separator to: ${value}`);
    this.separator = value;
    return this;
  }

  /**
   * @description Sets the active option style for select inputs.
   * @summary Configures the style applied to the currently selected option.
   *
   * @param value - The active option style.
   * @returns This UserInput instance for method chaining.
   */
  setActive(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting active style to: ${value}`);
    this.active = value;
    return this;
  }

  /**
   * @description Sets the inactive option style for select inputs.
   * @summary Configures the style applied to non-selected options.
   *
   * @param value - The inactive option style.
   * @returns This UserInput instance for method chaining.
   */
  setInactive(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting inactive style to: ${value}`);
    this.inactive = value;
    return this;
  }

  /**
   * @description Sets the choices for select inputs.
   * @summary Configures the list of options presented to the user.
   *
   * @param value - The list of choices.
   * @returns This UserInput instance for method chaining.
   */
  setChoices(value: Choice[] | PrevCaller<R, Choice[] | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting choices: ${JSON.stringify(value)}`);
    this.choices = value;
    return this;
  }

  /**
   * @description Sets the hint text for the prompt.
   * @summary Configures additional information displayed to the user.
   *
   * @param value - The hint text.
   * @returns This UserInput instance for method chaining.
   */
  setHint(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting hint to: ${value}`);
    this.hint = value;
    return this;
  }

  /**
   * @description Sets the warning text for the prompt.
   * @summary Configures a warning message displayed to the user.
   *
   * @param value - The warning text.
   * @returns This UserInput instance for method chaining.
   */
  setWarn(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting warn to: ${value}`);
    this.warn = value;
    return this;
  }

  /**
   * @description Sets the suggest function for autocomplete inputs.
   * @summary Configures a function to provide suggestions based on user input.
   *
   * @param value - The suggest function.
   * @returns This UserInput instance for method chaining.
   */
  setSuggest(value: ((input: any, choices: Choice[]) => Promise<any>) | undefined): this {
    UserInput.logger.verbose(`Setting suggest function`);
    this.suggest = value;
    return this;
  }

  /**
   * @description Sets the limit for list inputs.
   * @summary Configures the maximum number of items that can be selected in list-type prompts.
   * @template R - The type of the prompt name, extending string.
   * @param value - The maximum number of items that can be selected, or a function to determine this value.
   * @return This UserInput instance for method chaining.
   */
  setLimit(value: number | PrevCaller<R, number | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting limit to: ${value}`);
    this.limit = value;
    return this;
  }

  /**
   * @description Sets the mask for password inputs.
   * @summary Configures the character used to hide the user's input in password-type prompts.
   * @template R - The type of the prompt name, extending string.
   * @param value - The character used to mask the input, or a function to determine this value.
   * @return This UserInput instance for method chaining.
   */
  setMask(value: string | PrevCaller<R, string | Falsy> | undefined): this {
    UserInput.logger.verbose(`Setting mask to: ${value}`);
    this.mask = value;
    return this;
  }

  /**
   * @description Sets the stdout stream for the prompt.
   * @summary Configures the output stream used by the prompt for displaying messages and results.
   * @param value - The Writable stream to be used as stdout.
   * @return This UserInput instance for method chaining.
   */
  setStdout(value: Writable | undefined): this {
    UserInput.logger.verbose(`Setting stdout stream`);
    this.stdout = value;
    return this;
  }
  /**
   * @description Sets the stdin stream for the prompt.
   * @summary Configures the input stream used by the prompt for receiving user input.
   * @param value - The Readable stream to be used as stdin.
   * @return This UserInput instance for method chaining.
   */
  setStdin(value: Readable | undefined): this {
    this.stdin = value;
    return this;
  }

  /**
   * @description Asks the user for input based on the current UserInput configuration.
   * @summary Prompts the user and returns their response as a single value.
   * @template R - The type of the prompt name, extending string.
   * @return A Promise that resolves to the user's answer.
   */
  async ask(){
    return (await UserInput.ask(this))[this.name as keyof Answers<R>];
  }

  /**
   * @description Asks the user one or more questions based on the provided UserInput configurations.
   * @summary Prompts the user with one or more questions and returns their answers as an object.
   * @template R - The type of the prompt name, extending string.
   * @param question - A single UserInput instance or an array of UserInput instances.
   * @return A Promise that resolves to an object containing the user's answers.
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant A as ask method
   *   participant P as prompts library
   *   A->>P: Call prompts with question(s)
   *   P->>U: Display prompt(s)
   *   U->>P: Provide input
   *   P->>A: Return answers
   *   A->>A: Process answers
   *   A-->>Caller: Return processed answers
   */
  static async ask<R extends string = string>(question: UserInput<R> | UserInput<R>[]){
    const log = UserInput.logger.for(this.ask);
    if (!Array.isArray(question)) {
      question = [question];
    }
    let answers: Answers<R>;
    try {
      log.verbose(`Asking questions: ${question.map(q => q.name).join(", ")}`);
      answers = await prompts(question);
      log.verbose(`Received answers: ${JSON.stringify(answers, null, 2)}`);
    } catch (error: unknown) {
      throw new Error(`Error while getting input: ${error}`);
    }
    return answers;
  }

  /**
   * @description Asks the user for a number input.
   * @summary Prompts the user to enter a number, with optional minimum, maximum, and initial values.
   * @param name - The name of the prompt, used as the key in the returned answers object.
   * @param question - The message displayed to the user.
   * @param min - The minimum allowed value (optional).
   * @param max - The maximum allowed value (optional).
   * @param initial - The initial value presented to the user (optional).
   * @return A Promise that resolves to the number entered by the user.
   */
  static async askNumber(name: string, question: string, min?: number, max?: number, initial?: number): Promise<number> {
    const log = UserInput.logger.for(this.askNumber);
    log.verbose(`Asking number input: ${name}, question: ${question}, min: ${min}, max: ${max}, initial: ${initial}`);
    const userInput = new UserInput(name)
      .setMessage(question)
      .setType("number");

    if (typeof min === 'number')
      userInput.setMin(min);

    if (typeof max === 'number')
      userInput.setMax(max);

    if (typeof initial === 'number')
      userInput.setInitial(initial);

    return (await this.ask(userInput))[name];
  }

  /**
   * @description Asks the user for a text input.
   * @summary Prompts the user to enter text, with optional masking and initial value.
   * @param name - The name of the prompt, used as the key in the returned answers object.
   * @param question - The message displayed to the user.
   * @param mask - The character used to mask the input (optional, for password-like inputs).
   * @param initial - The initial value presented to the user (optional).
   * @return A Promise that resolves to the text entered by the user.
   */
  static async askText(name: string, question: string, mask: string | undefined = undefined, initial?: string): Promise<string> {
    const log = UserInput.logger.for(this.askText);
    log.verbose(`Asking text input: ${name}, question: ${question}, mask: ${mask}, initial: ${initial}`);
    const userInput = new UserInput(name)
      .setMessage(question);

    if (mask)
      userInput.setMask(mask);
    if (typeof initial ==='string')
      userInput.setInitial(initial);
    return (await this.ask(userInput))[name];
  }

  /**
   * @description Asks the user for a confirmation (yes/no).
   * @summary Prompts the user with a yes/no question and returns a boolean result.
   * @param name - The name of the prompt, used as the key in the returned answers object.
   * @param question - The message displayed to the user.
   * @param initial - The initial value presented to the user (optional).
   * @return A Promise that resolves to a boolean representing the user's answer.
   */
  static async askConfirmation(name: string, question: string, initial?: boolean): Promise<boolean> {
    const log = UserInput.logger.for(this.askConfirmation);
    log.verbose(`Asking confirmation input: ${name}, question: ${question}, initial: ${initial}`);
    const userInput = new UserInput(name)
      .setMessage(question)
      .setType("confirm")

    if (typeof initial !== "undefined")
      userInput.setInitial(initial);
    return (await this.ask(userInput))[name];
  }
  /**
   * @description Repeatedly asks for input until a valid response is given or the limit is reached.
   * @summary This method insists on getting a valid input from the user, allowing for a specified number of attempts.
   *
   * @template R - The type of the expected result.
   * @param input - The UserInput instance to use for prompting.
   * @param test - A function to validate the user's input.
   * @param limit - The maximum number of attempts allowed (default is 1).
   * @param defaultConfirmation
   * @return A Promise that resolves to the valid input or undefined if the limit is reached.
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant I as insist method
   *   participant A as ask method
   *   participant T as test function
   *   participant C as askConfirmation method
   *   loop Until valid input or limit reached
   *     I->>A: Call ask with input
   *     A->>U: Prompt user
   *     U->>A: Provide input
   *     A->>I: Return result
   *     I->>T: Test result
   *     alt Test passes
   *       I->>C: Ask for confirmation
   *       C->>U: Confirm input
   *       U->>C: Provide confirmation
   *       C->>I: Return confirmation
   *       alt Confirmed
   *         I-->>Caller: Return valid result
   *       else Not confirmed
   *         I->>I: Continue loop
   *       end
   *     else Test fails
   *       I->>I: Continue loop
   *     end
   *   end
   *   I-->>Caller: Return undefined if limit reached
   */
  static async insist<R>(input: UserInput, test: (res: string | number) => boolean, defaultConfirmation: boolean, limit = 1, ): Promise<R | undefined> {
    const log = UserInput.logger.for(this.insist);
    log.verbose(`Insisting on input: ${input.name}, test: ${test.toString()}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
    let result: string | number | undefined = undefined;
    let count = 0
    let confirmation: boolean;
    try {
      do {
        result = (await UserInput.ask(input))[input.name as keyof Answers<string>] as string;
        if (!test(result)) {
          result = undefined;
          continue;
        }
        confirmation = await UserInput.askConfirmation(`${input.name}-confirm`, `Is the ${input.type} correct?`, defaultConfirmation);
        if (!confirmation)
          result = undefined;
      } while (typeof result === "undefined" && limit > 1 && count++ < limit);
    } catch (e: unknown) {
      log.error(`Error while insisting: ${e}`);
      throw e;
    }

    if (typeof result === "undefined")
      log.info("no selection...");
    return result as R | undefined;
  }
  /**
   * @description Repeatedly asks for text input until a valid response is given or the limit is reached.
   * @summary This method insists on getting a valid text input from the user, allowing for a specified number of attempts.
   *
   * @param name - The name of the prompt, used as the key in the returned answers object.
   * @param question - The message displayed to the user.
   * @param test - A function to validate the user's input.
   * @param mask - The character used to mask the input (optional, for password-like inputs).
   * @param initial - The initial value presented to the user (optional).
   * @param defaultConfirmation
   * @param limit - The maximum number of attempts allowed (default is -1, meaning unlimited).
   * @return A Promise that resolves to the valid input or undefined if the limit is reached.
   */
  static async insistForText(name: string, question: string, test: (res: string) => boolean, mask: string | undefined = undefined, initial?: string, defaultConfirmation = false, limit = -1): Promise<string | undefined> {
    const log = UserInput.logger.for(this.insistForText);
    log.verbose(`Insisting for text input: ${name}, question: ${question}, test: ${test.toString()}, mask: ${mask}, initial: ${initial}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
    const userInput = new UserInput(name)
      .setMessage(question);

    if (mask)
      userInput.setMask(mask);
    if (typeof initial ==='string')
      userInput.setInitial(initial);
    return this.insist(userInput, test as (res: string | number) => boolean, defaultConfirmation, limit);
  }
  /**
   * @description Repeatedly asks for number input until a valid response is given or the limit is reached.
   * @summary This method insists on getting a valid number input from the user, allowing for a specified number of attempts.
   *
   * @param name - The name of the prompt, used as the key in the returned answers object.
   * @param question - The message displayed to the user.
   * @param test - A function to validate the user's input.
   * @param min - The minimum allowed value (optional).
   * @param max - The maximum allowed value (optional).
   * @param initial - The initial value presented to the user (optional).
   * @param defaultConfirmation
   * @param limit - The maximum number of attempts allowed (default is -1, meaning unlimited).
   * @return A Promise that resolves to the valid input or undefined if the limit is reached.
   */
  static async insistForNumber(name: string, question: string, test: (res: number) => boolean, min?: number, max?: number, initial?: number, defaultConfirmation = false, limit = -1): Promise<string | undefined> {
    const log = UserInput.logger.for(this.insistForNumber);
    log.verbose(`Insisting for number input: ${name}, question: ${question}, test: ${test.toString()}, min: ${min}, max: ${max}, initial: ${initial}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
    const userInput = new UserInput(name)
      .setMessage(question)
      .setType("number");

    if (typeof min === 'number')
      userInput.setMin(min);

    if (typeof max === 'number')
      userInput.setMax(max);

    if (typeof initial === 'number')
      userInput.setInitial(initial);
    return this.insist(userInput, test as (res: string | number) => boolean, defaultConfirmation, limit);
  }

  /**
   * @description Parses command-line arguments based on the provided options.
   * @summary Uses Node.js's util.parseArgs to parse command-line arguments and return the result.
   * @param options - Configuration options for parsing arguments.
   * @return An object containing the parsed arguments.
   * @mermaid
   * sequenceDiagram
   *   participant C as Caller
   *   participant P as parseArgs method
   *   participant U as util.parseArgs
   *   C->>P: Call with options
   *   P->>P: Prepare args object
   *   P->>U: Call parseArgs with prepared args
   *   U->>P: Return parsed result
   *   P-->>C: Return ParseArgsResult
   */
  static parseArgs(options: ParseArgsOptionsConfig): ParseArgsResult {
    const log = UserInput.logger.for(this.parseArgs);
    const args: ParseArgsConfig = {
      args: process.argv.slice(2),
      options: options
    }
    log.debug(`Parsing arguments: ${JSON.stringify(args, null, 2)}`);
    try {
      return parseArgs(args);
    } catch (error: unknown) {
      log.debug(`Error while parsing arguments:\n${JSON.stringify(args, null, 2)}\n | options\n${JSON.stringify(options, null ,2)}\n | ${error}`);
      throw new Error(`Error while parsing arguments: ${error}`);
    }
  }
}