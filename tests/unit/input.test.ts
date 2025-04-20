// input.test.ts
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
