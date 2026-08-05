<script lang="ts">
  import type { InscrivaBridge, ProviderStatus } from "@inscriva/bridge";
  import { DEFAULT_MODELS, authInfoForProvider } from "@inscriva/llm";
  import {
    DEFAULT_CUSTOM_BASE_URL,
    LLM_PROVIDERS,
    loadCustomBaseUrl,
    loadModelOverrides,
    modelForProvider,
    saveCustomBaseUrl,
    saveModelOverride,
    savePreferredProvider,
    type LlmProviderId,
  } from "./llm-settings.js";

  import {
    DEFAULT_RECOMMENDATION_SETTINGS,
    saveRecommendationSettings,
    type RecommendationSettings,
  } from "./recommendation-settings.js";
  import type { RecommendationId } from "@inscriva/indexer";

  interface Props {
    bridge: InscrivaBridge;
    open: boolean;
    recommendationSettings?: RecommendationSettings;
    onclose: () => void;
  }

  let {
    bridge,
    open,
    recommendationSettings = $bindable(DEFAULT_RECOMMENDATION_SETTINGS),
    onclose,
  }: Props = $props();

  let providers = $state<ProviderStatus[]>([]);
  let keyInputs = $state<Record<string, string>>({});
  let modelInputs = $state<Partial<Record<LlmProviderId, string>>>({});
  let customBaseUrl = $state(DEFAULT_CUSTOM_BASE_URL);
  let message = $state("");
  let messageTone = $state<"success" | "error" | null>(null);
  let busy = $state(false);
  let confirmTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (!open) return;
    message = "";
    messageTone = null;
    void refresh();
  });

  $effect(() => {
    return () => {
      if (confirmTimer) clearTimeout(confirmTimer);
    };
  });

  function showConfirmation(text: string) {
    message = text;
    messageTone = "success";
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      if (messageTone === "success" && message === text) {
        message = "";
        messageTone = null;
      }
    }, 4000);
  }

  function showError(text: string) {
    message = text;
    messageTone = "error";
    if (confirmTimer) clearTimeout(confirmTimer);
  }

  async function refresh() {
    providers = await bridge.listProviders();
    modelInputs = { ...loadModelOverrides() };
    customBaseUrl = loadCustomBaseUrl();
    for (const id of LLM_PROVIDERS) {
      if (!modelInputs[id]) modelInputs[id] = modelForProvider(id);
    }
  }

  async function saveKey(provider: string) {
    const key = keyInputs[provider]?.trim();
    if (!key) return;

    const ok = window.confirm(
      `Save the API key for ${provider}?\n\nIt will be stored securely on this device, not in your book folder.`,
    );
    if (!ok) return;

    busy = true;
    message = "";
    messageTone = null;
    try {
      await bridge.setApiKey(provider, key);
      savePreferredProvider(provider as LlmProviderId);
      keyInputs[provider] = "";
      await refresh();
      showConfirmation(`${provider} API key saved.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      busy = false;
    }
  }

  async function clearKey(provider: string) {
    const ok = window.confirm(`Remove the saved API key for ${provider}?`);
    if (!ok) return;

    busy = true;
    message = "";
    messageTone = null;
    try {
      await bridge.clearApiKey(provider);
      await refresh();
      showConfirmation(`${provider} API key removed.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      busy = false;
    }
  }

  function saveModels() {
    for (const id of LLM_PROVIDERS) {
      const model = modelInputs[id]?.trim();
      if (model) saveModelOverride(id, model);
    }
    showConfirmation("Default models saved.");
  }

  const RULE_LABELS: Record<RecommendationId, string> = {
    "word-target-near": "Word target near (90–110%)",
    "word-target-over": "Word target over band",
    "unlinked-plants": "Unlinked plants",
    "alignment-stale": "Alignment stale",
    "alignment-warnings": "Alignment warnings",
  };

  function toggleRecommendationRule(id: RecommendationId, enabled: boolean) {
    const disabled = new Set(recommendationSettings.disabledRuleIds);
    if (enabled) disabled.delete(id);
    else disabled.add(id);
    recommendationSettings = {
      ...recommendationSettings,
      disabledRuleIds: [...disabled],
    };
    saveRecommendationSettings(recommendationSettings);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="backdrop" role="presentation" onclick={onclose}></div>
  <dialog class="modal" open aria-labelledby="settings-title">
    <header class="modal-header">
      <div class="modal-header-row">
        <h2 id="settings-title">Settings</h2>
        <button type="button" class="close" onclick={onclose} aria-label="Close settings">
          ×
        </button>
      </div>
      {#if message}
        <p
          class="status"
          class:success={messageTone === "success"}
          class:error={messageTone === "error"}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      {/if}
    </header>

    <div class="modal-body">
    <section>
      <h3>LLM providers (BYOK)</h3>
      <p class="hint">
        API keys are stored in the native bridge secure store — never in your book repo.
        LLM sign-in OAuth is not available in v1 — use API keys from each provider&apos;s developer console.
      </p>

      {#each LLM_PROVIDERS as provider}
        {@const status = providers.find((p) => p.provider === provider)}
        {@const auth = authInfoForProvider(provider)}
        <div class="provider-row">
          <div class="provider-head">
            <strong>{provider}</strong>
            <span class:configured={status?.configured}>
              {status?.configured ? "Configured" : "Not set"}
            </span>
          </div>
          {#if auth}
            <p class="auth-hint">{auth.hint}</p>
          {/if}
          <label>
            API key
            <input
              type="password"
              autocomplete="off"
              placeholder={status?.configured ? "Replace key…" : "Paste API key"}
              bind:value={keyInputs[provider]}
            />
          </label>
          <label>
            Default model
            <input
              type="text"
              bind:value={modelInputs[provider]}
              placeholder={DEFAULT_MODELS[provider].default}
            />
          </label>
          <div class="actions">
            <button type="button" disabled={busy} onclick={() => saveKey(provider)}>
              Save key
            </button>
            {#if status?.configured}
              <button type="button" class="ghost" disabled={busy} onclick={() => clearKey(provider)}>
                Clear key
              </button>
            {/if}
          </div>
        </div>
      {/each}

      <button type="button" class="primary" disabled={busy} onclick={saveModels}>
        Save model defaults
      </button>

      <div class="provider-row custom-url">
        <div class="provider-head">
          <strong>Custom base URL</strong>
        </div>
        <p class="hint">
          OpenAI-compatible endpoint for the <strong>custom</strong> provider (e.g. Ollama
          at <code>http://127.0.0.1:11434/v1</code>). Use any API key value for local servers.
        </p>
        <label>
          Base URL
          <input type="url" bind:value={customBaseUrl} placeholder={DEFAULT_CUSTOM_BASE_URL} />
        </label>
        <button
          type="button"
          disabled={busy}
          onclick={() => {
            saveCustomBaseUrl(customBaseUrl);
            showConfirmation("Custom base URL saved.");
          }}
        >
          Save custom URL
        </button>
      </div>
    </section>

    <section>
      <h3>Recommendations</h3>
      <p class="hint">
        Local nudges only — they never call AI automatically. Disable rules you do not want
        to see in the Alignment tab.
      </p>
      <label class="toggle-row">
        <input
          type="checkbox"
          checked={recommendationSettings.enabled}
          onchange={(e) => {
            recommendationSettings = {
              ...recommendationSettings,
              enabled: (e.currentTarget as HTMLInputElement).checked,
            };
            saveRecommendationSettings(recommendationSettings);
          }}
        />
        Show recommendations
      </label>
      {#each Object.entries(RULE_LABELS) as [id, label]}
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={!recommendationSettings.disabledRuleIds.includes(id as RecommendationId)}
            disabled={!recommendationSettings.enabled}
            onchange={(e) =>
              toggleRecommendationRule(
                id as RecommendationId,
                (e.currentTarget as HTMLInputElement).checked,
              )}
          />
          {label}
        </label>
      {/each}
    </section>
    </div>
  </dialog>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 25, 23, 0.35);
    z-index: 40;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 50;
    display: flex;
    flex-direction: column;
    width: min(520px, calc(100vw - 2rem));
    min-height: 80vh;
    max-height: 90vh;
    overflow: hidden;
    margin: 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg-elevated);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  }

  .modal-header {
    flex-shrink: 0;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .modal-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 1.25rem 1.25rem;
  }

  .status {
    margin: 0.65rem 0 0;
    padding: 0.45rem 0.6rem;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .status.success {
    background: #ecfdf5;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .status.error {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  h3 {
    margin: 0 0 0.35rem;
    font-size: 0.95rem;
  }

  .close {
    border: none;
    background: transparent;
    font-size: 1.4rem;
    line-height: 1;
    color: var(--text-muted);
  }

  .hint {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0.35rem 0;
    font-size: 0.8rem;
  }

  .provider-row {
    padding: 0.85rem 0;
    border-top: 1px solid var(--border);
  }

  .auth-hint {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.35;
  }

  .provider-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    text-transform: capitalize;
  }

  .provider-head span {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .provider-head span.configured {
    color: #15803d;
  }

  label {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  input {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font: inherit;
    background: var(--surface-input);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.35rem;
  }

  .actions button,
  .primary {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    background: var(--bg-muted);
  }

  .primary {
    margin-top: 1rem;
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .ghost {
    background: transparent;
  }
</style>
