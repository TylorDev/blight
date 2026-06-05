import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryStore } from "../../src/stores/history-store";
import { createTicket, installBlightMock } from "./mock-blight";

let blight: ReturnType<typeof installBlightMock>;

beforeEach(() => {
  blight = installBlightMock();
  useHistoryStore.setState({
    tickets: [],
    loading: false,
    error: null
  });
});

describe("history-store", () => {
  it("loads closed tickets from window.blight", async () => {
    const history = [
      createTicket({
        status: "CERRADO",
        closedAt: "2026-01-01T01:00:00.000Z"
      })
    ];
    blight.listHistory.mockResolvedValue(history);

    await useHistoryStore.getState().loadHistory();

    expect(blight.listHistory).toHaveBeenCalledTimes(1);
    expect(useHistoryStore.getState().tickets).toEqual(history);
    expect(useHistoryStore.getState().loading).toBe(false);
  });

  it("stores and rethrows load errors", async () => {
    const failure = new Error("history unavailable");
    blight.listHistory.mockRejectedValue(failure);

    await expect(useHistoryStore.getState().loadHistory()).rejects.toThrow("history unavailable");

    expect(useHistoryStore.getState().error).toBe("history unavailable");
    expect(useHistoryStore.getState().loading).toBe(false);
  });

  it("clears closed tickets from window.blight", async () => {
    useHistoryStore.setState({
      tickets: [createTicket({ status: "CERRADO", closedAt: "2026-01-01T01:00:00.000Z" })],
      loading: false,
      error: null
    });
    blight.clearHistory.mockResolvedValue([]);

    await useHistoryStore.getState().clearHistory();

    expect(blight.clearHistory).toHaveBeenCalledTimes(1);
    expect(useHistoryStore.getState().tickets).toEqual([]);
    expect(useHistoryStore.getState().loading).toBe(false);
  });

  it("stores and rethrows clear errors", async () => {
    const failure = new Error("history clear unavailable");
    blight.clearHistory.mockRejectedValue(failure);

    await expect(useHistoryStore.getState().clearHistory()).rejects.toThrow("history clear unavailable");

    expect(useHistoryStore.getState().error).toBe("history clear unavailable");
    expect(useHistoryStore.getState().loading).toBe(false);
  });
});
