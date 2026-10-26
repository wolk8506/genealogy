import { appButtonBaseSx, appButtonPresetSx } from "./appButtonStyles";

export const btnStyleGrey = {
  ...appButtonBaseSx,
  ...appButtonPresetSx.secondary,
};

export const btnStyleBlue = {
  ...appButtonBaseSx,
  ...appButtonPresetSx.primary,
};

export const btnStyleRed = {
  ...appButtonBaseSx,
  ...appButtonPresetSx.danger,
};
