const asyncHandler = require("../src/utils/asyncHandler");

describe("asyncHandler", () => {
  test("calls the wrapped handler with (req, res, next)", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const req = {};
    const res = {};
    const next = jest.fn();

    await asyncHandler(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards a rejected promise to next() instead of throwing", async () => {
    const error = new Error("something broke");
    const handler = jest.fn().mockRejectedValue(error);
    const next = jest.fn();

    await asyncHandler(handler)({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // Every route in this codebase wraps an `async (req, res) => {...}` function, never a
  // plain synchronous one — that matters here, because asyncHandler only catches a
  // *rejected promise* (via .catch), not a raw synchronous throw. An async function
  // converts a throw before its first `await` into a rejected promise automatically,
  // which is what actually makes this safe in practice; a plain function that throws
  // synchronously would escape uncaught instead of reaching next().
  test("catches a throw from an async handler (thrown before any await)", async () => {
    const error = new Error("thrown synchronously inside an async function");
    const handler = jest.fn(async () => {
      throw error;
    });
    const next = jest.fn();

    await asyncHandler(handler)({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test("does not call next() when the handler resolves successfully", async () => {
    const handler = jest.fn().mockResolvedValue("ok");
    const next = jest.fn();

    await asyncHandler(handler)({}, {}, next);

    expect(next).not.toHaveBeenCalled();
  });
});
