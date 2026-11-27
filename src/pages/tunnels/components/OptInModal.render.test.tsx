// Formulaire d'inscription des tunnels pub : France, Belgique, Suisse et
// Luxembourg seulement (décision de Sidali du 27/11/2026).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MESSAGE_HORS_ZONE } from "@/lib/zoneLead";

const submitTunnelLead = vi.fn(async () => ({ scoring_token: null }));
vi.mock("../lib/api", () => ({ submitTunnelLead: (...a: unknown[]) => submitTunnelLead(...(a as [])) }));
vi.mock("../lib/conference", () => ({ useConference: () => ({ dateLabel: "Dimanche 30 novembre" }) }));
vi.mock("../lib/pixel", () => ({ markLeadPending: vi.fn(), nouvelIdEvenement: () => "evt-test-1234" }));

import OptInModal from "./OptInModal";
import { WA_TUNNEL } from "../config";

function remplir(telephone: string) {
  const tunnel = WA_TUNNEL;
  render(
    <MemoryRouter>
      <OptInModal open onClose={() => {}} tunnel={tunnel} />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByPlaceholderText("Prénom"), { target: { value: "Sara" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "sara@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Numéro de téléphone"), { target: { value: telephone } });
  const bouton = screen.getAllByRole("button").find((b) => b.getAttribute("type") === "submit")!;
  fireEvent.click(bouton);
}

describe("formulaire d'inscription : zone ciblée seulement", () => {
  beforeEach(() => submitTunnelLead.mockClear());

  it("ne propose que la France, la Belgique, la Suisse et le Luxembourg", () => {
    remplir("");
    const options = [...document.querySelectorAll("select.PhoneInputCountrySelect option")]
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean);
    expect(options.sort()).toEqual(["BE", "CH", "FR", "LU"]);
  });

  it("refuse un numéro algérien tapé à la main, sans rien envoyer", async () => {
    remplir("+213 551 23 45 67");
    await waitFor(() => expect(screen.getByText(/numéro/i)).toBeTruthy());
    expect(submitTunnelLead).not.toHaveBeenCalled();
  });

  it("accepte un numéro suisse", async () => {
    remplir("+41 79 123 45 67");
    await waitFor(() => expect(submitTunnelLead).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(MESSAGE_HORS_ZONE)).toBeNull();
  });
});
