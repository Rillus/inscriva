/** Whether prepare/ready callbacks should run for this markdown preview pass. */
export function shouldNotifyPresentationLifecycle(
  notifyReady: boolean,
  awaitPresentation: boolean,
  presentationSignalled: boolean,
): boolean {
  return notifyReady && awaitPresentation && !presentationSignalled;
}
