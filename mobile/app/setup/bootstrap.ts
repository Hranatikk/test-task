import type { RootStore } from '@stores/rootStore';

/** Runs once at app start, after store creation and before the first real render of the import screen. */
export async function bootstrap(rootStore: RootStore): Promise<void> {
  await rootStore.importController.bootstrap();
}
