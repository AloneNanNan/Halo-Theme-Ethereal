<script lang="ts">
  import { getDefaultHue, getHue, setHue } from "../../utils/setting-utils";
  import { t } from "../../utils/i18n";

  let hue = $state(getHue());
  const defaultHue = getDefaultHue();

  function resetHue() {
    hue = getDefaultHue();
  }

  $effect(() => {
    setHue(hue);
  });
</script>

<div id="display-setting" class="float-panel float-panel-closed absolute w-80 right-4 px-4 py-4">
  <div class="flex flex-row gap-2 mb-3 items-center justify-between">
    <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
            before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
            before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
    >
      {t("theme.color", "主题色")}
      <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md  active:scale-90 will-change-transform"
              class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue} on:click={resetHue}>
        <div class="text-(--btn-content)">
          <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
        </div>
      </button>
    </div>
    <div class="flex gap-1">
      <div id="hueValue" class="transition bg-(--btn-regular-bg) w-10 h-7 rounded-md flex justify-center
            font-bold text-sm items-center text-(--btn-content)">
        {hue}
      </div>
    </div>
  </div>
  <div class="w-full h-6 rounded select-none overflow-hidden">
    <input aria-label="11" type="range" min="0" max="360" bind:value={hue}
           class="display-setting-slider" id="colorSlider" step="5" style="width: 100%">
  </div>
</div>


<style>
  #display-setting input[type="range"].display-setting-slider {
    -webkit-appearance: none;
    height: 1.5rem;
    background-image: var(--color-selection-bar);
    transition: background-image 0.15s ease-in-out;
  }

  #display-setting input[type="range"].display-setting-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }

  #display-setting input[type="range"].display-setting-slider::-webkit-slider-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  #display-setting input[type="range"].display-setting-slider::-webkit-slider-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }

  #display-setting input[type="range"].display-setting-slider::-moz-range-thumb {
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    border-width: 0;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }

  #display-setting input[type="range"].display-setting-slider::-moz-range-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  #display-setting input[type="range"].display-setting-slider::-moz-range-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }

  #display-setting input[type="range"].display-setting-slider::-ms-thumb {
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }

  #display-setting input[type="range"].display-setting-slider::-ms-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  #display-setting input[type="range"].display-setting-slider::-ms-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }
</style>
