import { Client } from "stoat.js";

import { State } from "..";

import { AbstractStore } from ".";

export interface TypeCapabilities {
  loaded: boolean;
  emergency_kill_switch: boolean;
  global: Record<string, boolean>;
  promoted: string[];
  effective: Record<string, boolean>;
}

type CapabilitiesResponse = {
  emergency_kill_switch?: boolean;
  global?: Record<string, boolean>;
  promoted?: string[];
  effective?: Record<string, boolean>;
};

/**
 * Feature capability and rollout store.
 */
export class Capabilities extends AbstractStore<"capabilities", TypeCapabilities> {
  constructor(state: State) {
    super(state, "capabilities");
  }

  hydrate(): void {
    // no-op
  }

  default(): TypeCapabilities {
    return {
      loaded: false,
      emergency_kill_switch: false,
      global: {},
      promoted: [],
      effective: {},
    };
  }

  clean(input: Partial<TypeCapabilities>): TypeCapabilities {
    const next = this.default();

    next.loaded = typeof input.loaded === "boolean" ? input.loaded : false;
    next.emergency_kill_switch =
      typeof input.emergency_kill_switch === "boolean"
        ? input.emergency_kill_switch
        : false;
    next.promoted = Array.isArray(input.promoted)
      ? input.promoted.filter((value): value is string => typeof value === "string")
      : [];

    if (input.global && typeof input.global === "object") {
      for (const [key, value] of Object.entries(input.global)) {
        if (typeof value === "boolean") next.global[key] = value;
      }
    }

    if (input.effective && typeof input.effective === "object") {
      for (const [key, value] of Object.entries(input.effective)) {
        if (typeof value === "boolean") next.effective[key] = value;
      }
    }

    return next;
  }

  async refresh(client: Client) {
    try {
      const response = (await client.api.get(
        "/sync/features",
      )) as CapabilitiesResponse;
      this.set(this.clean({ ...response, loaded: true }));
    } catch {
      // keep defaults; features fall back to local settings
      this.set("loaded", true);
    }
  }

  isEnabled(featureKey: string, fallback = false): boolean {
    const data = this.get();
    if (data.emergency_kill_switch) return false;
    if (featureKey in data.effective) return data.effective[featureKey];
    if (featureKey in data.global) return data.global[featureKey];
    return fallback;
  }
}
