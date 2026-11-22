import { type Location, MemoryHistory } from "@micro-router/history";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { useLocation } from "./hooks";
import { Navigator } from "./navigator";
import { NavigatorProvider } from "./provider";

/** A memory history that counts its observers. */
class CountingHistory extends MemoryHistory {
  active = 0;
  override observe(handler: (l: Location) => void) {
    this.active += 1;
    const stop = super.observe(handler);
    return () => {
      this.active -= 1;
      stop();
    };
  }
}

const ShowPath = ({ name }: { name: string }) => (
  <p>
    {name}: {useLocation().pathname}
  </p>
);

describe("NavigatorProvider", () => {
  it("lets go of the history once nothing under it is listening", async () => {
    const history = new CountingHistory();
    const navigator = new Navigator(history);

    const page = await render(
      <NavigatorProvider navigator={navigator}>
        <ShowPath name="Here" />
      </NavigatorProvider>,
    );
    expect(history.active).toBe(1);

    await page.unmount();
    expect(history.active).toBe(0);
  });

  it("keeps a shared navigator working after another provider unmounts", async () => {
    const history = new CountingHistory();
    const navigator = new Navigator(history);
    navigator.push("/a");
    navigator.push("/b");

    const Toggle = () => {
      const [shown, setShown] = useState(true);
      return (
        <>
          <button
            onClick={() => {
              setShown(false);
            }}
          >
            Hide
          </button>
          {shown && (
            <NavigatorProvider navigator={navigator}>
              <ShowPath name="Hidden" />
            </NavigatorProvider>
          )}
        </>
      );
    };
    const page = await render(
      <>
        <NavigatorProvider navigator={navigator}>
          <ShowPath name="Kept" />
        </NavigatorProvider>
        <Toggle />
      </>,
    );

    await userEvent.click(page.getByRole("button", { name: "Hide" }));
    await expect.element(page.getByText("Hidden: /b")).not.toBeInTheDocument();
    history.go(-1);
    await expect.element(page.getByText("Kept: /a")).toBeVisible();
  });
});
