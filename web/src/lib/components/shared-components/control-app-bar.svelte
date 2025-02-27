<script lang="ts">
  import { browser } from '$app/environment';

  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import CircleIconButton from '../elements/buttons/circle-icon-button.svelte';
  import { fly } from 'svelte/transition';
  import { mdiClose } from '@mdi/js';

  export let showBackButton = true;
  export let backIcon = mdiClose;
  export let tailwindClasses = '';
  export let forceDark = false;

  let appBarBorder = 'bg-immich-bg border border-transparent';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  const onScroll = () => {
    if (window.pageYOffset > 80) {
      appBarBorder = 'border border-gray-200 bg-gray-50 dark:border-gray-600';

      if (forceDark) {
        appBarBorder = 'border border-gray-600';
      }
    } else {
      appBarBorder = 'bg-immich-bg border border-transparent';
    }
  };

  onMount(() => {
    if (browser) {
      document.addEventListener('scroll', onScroll);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('scroll', onScroll);
    }
  });
</script>

<div in:fly={{ y: 10, duration: 200 }} class="absolute top-0 w-full z-[100] bg-transparent">
  <div
    id="asset-selection-app-bar"
    class={`grid grid-cols-[10%_80%_10%] justify-between md:grid-cols-[20%_60%_20%] lg:grid-cols-3 ${appBarBorder} mx-2 mt-2 place-items-center rounded-lg p-2 transition-all ${tailwindClasses} dark:bg-immich-dark-gray ${
      forceDark && 'bg-immich-dark-gray text-white'
    }`}
  >
    <div class="flex place-items-center gap-6 justify-self-start dark:text-immich-dark-fg">
      {#if showBackButton}
        <CircleIconButton
          on:click={() => dispatch('close')}
          icon={backIcon}
          backgroundColor={'transparent'}
          hoverColor={'#e2e7e9'}
          size={'24'}
          forceDark
        />
      {/if}
      <slot name="leading" />
    </div>

    <div class="w-full">
      <slot />
    </div>

    <div class="mr-4 flex place-items-center gap-1 justify-self-end">
      <slot name="trailing" />
    </div>
  </div>
</div>
