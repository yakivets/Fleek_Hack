export function changeScreenUnlessSharing(isSharingToEbay, setScreen, nextScreen) {
  if (isSharingToEbay) return false;
  setScreen(nextScreen);
  return true;
}
