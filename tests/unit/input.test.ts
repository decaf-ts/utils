// input.test.ts
import { Writable, Readable } from "stream";
import { UserInput } from "../../src/input/input";

describe("UserInput Class", () => {
  describe("constructor", () => {
    it("should initialize with the given name", () => {
      const name = "testPrompt";
      const userInput = new UserInput(name);
      expect(userInput.name).toBe(name);
    });
  });

  describe("setType", () => {
    it("should set the type of the prompt", () => {
      const userInput = new UserInput("testPrompt");
      userInput.setType("number");
      expect(userInput.type).toBe("number");
    });
  });

  describe("setMessage", () => {
    it("should set the message of the prompt", () => {
      const message = "Enter your name:";
      const userInput = new UserInput("testPrompt");
      userInput.setMessage(message);
      expect(userInput.message).toBe(message);
    });
  });

  describe("setInitial", () => {
    it("should set the initial value of the prompt", () => {
      const initialValue = "default";
      const userInput = new UserInput("testPrompt");
      userInput.setInitial(initialValue);
      expect(userInput.initial).toBe(initialValue);
    });
  });

  describe("setStyle", () => {
    it("should set the style of the prompt", () => {
      const style = "bold";
      const userInput = new UserInput("testPrompt");
      userInput.setStyle(style);
      expect(userInput.style).toBe(style);
    });
  });

  describe("setValidate", () => {
    it("should set the validation function of the prompt", () => {
      const validate = jest.fn();
      const userInput = new UserInput("testPrompt");
      userInput.setValidate(validate);
      expect(userInput.validate).toBe(validate);
    });
  });

  describe("setOnState", () => {
    it("should set the onState callback", () => {
      const onStateCallback = jest.fn();
      const userInput = new UserInput("testPrompt");
      userInput.setOnState(onStateCallback);
      expect(userInput.onState).toBe(onStateCallback);
    });
  });


  describe("additional setters", () => {
    it("should configure optional behaviours", () => {
      const userInput = new UserInput("advanced");
      const format = jest.fn();
      const validate = jest.fn();
      const onState = jest.fn();
      const suggest = jest.fn(async () => "option-a");
      const stdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });
      const stdin = new Readable({
        read() {
          this.push(null);
        },
      });

      userInput
        .setFormat(format)
        .setValidate(validate)
        .setOnState(onState)
        .setMin(1)
        .setMax(10)
        .setFloat(true)
        .setRound(2)
        .setInstructions("instruction")
        .setIncrement(2)
        .setSeparator(",")
        .setActive("active")
        .setInactive("inactive")
        .setChoices([
          {
            title: "Option A",
            value: "option-a",
          } as any,
        ])
        .setHint("Hint")
        .setWarn("Warn")
        .setSuggest(suggest)
        .setLimit(5)
        .setMask("*")
        .setStdout(stdout)
        .setStdin(stdin);

      expect(userInput.format).toBe(format);
      expect(userInput.validate).toBe(validate);
      expect(userInput.onState).toBe(onState);
      expect(userInput.min).toBe(1);
      expect(userInput.max).toBe(10);
      expect(userInput.float).toBe(true);
      expect(userInput.round).toBe(2);
      expect(userInput.instructions).toBe("instruction");
      expect(userInput.increment).toBe(2);
      expect(userInput.separator).toBe(",");
      expect(userInput.active).toBe("active");
      expect(userInput.inactive).toBe("inactive");
      expect(userInput.choices).toHaveLength(1);
      expect(userInput.hint).toBe("Hint");
      expect(userInput.warn).toBe("Warn");
      expect(userInput.suggest).toBe(suggest);
      expect(userInput.limit).toBe(5);
      expect(userInput.mask).toBe("*");
      expect(userInput.stdout).toBe(stdout);
      expect(userInput.stdin).toBe(stdin);
    });
  });

  describe("static askNumber", () => {
    it("should configure and prompt for a number input", async () => {
      const mockPrompt = jest.fn(() => Promise.resolve({ numberPrompt: 42 }));
      jest.spyOn(UserInput, "ask").mockImplementation(mockPrompt);

      const result = await UserInput.askNumber(
        "numberPrompt",
        "Enter a number:",
        0,
        100,
        50
      );

      expect(result).toBe(42);
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe("static askText", () => {
    it("should configure and prompt for a text input", async () => {
      const mockPrompt = jest.fn(() =>
        Promise.resolve({ textPrompt: "hello" })
      );
      jest.spyOn(UserInput, "ask").mockImplementation(mockPrompt);

      const result = await UserInput.askText("textPrompt", "Enter text:");

      expect(result).toBe("hello");
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe("static askConfirmation", () => {
    it("should configure and prompt for a confirmation", async () => {
      const mockPrompt = jest.fn(() =>
        Promise.resolve({ confirmPrompt: true })
      );
      jest.spyOn(UserInput, "ask").mockImplementation(mockPrompt);

      const result = await UserInput.askConfirmation(
        "confirmPrompt",
        "Are you sure?",
        true
      );

      expect(result).toBe(true);
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe("static insistForText", () => {
    it("should repeatedly prompt for text input until valid", async () => {
      const mockPrompt = jest
        .fn()
        .mockResolvedValueOnce({ validText: "invalid" })
        .mockResolvedValueOnce({ validText: "valid" });
      const mockConfirmation = jest.fn(() => Promise.resolve(true));

      jest.spyOn(UserInput, "ask").mockImplementation(mockPrompt);
      jest
        .spyOn(UserInput, "askConfirmation")
        .mockImplementation(mockConfirmation);

      const result = await UserInput.insistForText(
        "validText",
        "Enter valid text:",
        (input) => input === "valid",
        undefined,
        "default",
        true,
        2
      );

      expect(result).toBe("valid");
      expect(mockPrompt).toHaveBeenCalledTimes(2);
      expect(mockConfirmation).toHaveBeenCalled();
    });
  });
});
