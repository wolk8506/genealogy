import { Dialog, Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AppButton from "../components/AppButton";

const LICENSE_TEXT = `
Copyright © 2026 nebula.9371.  
All rights reserved.


This software and its associated source code are the intellectual property of the author. No part of this project may be copied, distributed, published, modified, reverse-engineered, or used in any commercial or non-commercial capacity without explicit, prior written permission from the author.

Any unauthorized use, including but not limited to reproduction, redistribution, modification, sublicensing, or publication, is strictly prohibited and may result in legal action.

This repository is intended solely for reference and convenience of the author. It is not licensed for public use, contribution, or distribution.

Данное программное обеспечение и связанный с ним исходный код являются интеллектуальной собственностью автора. Никакая часть данного проекта не может быть скопирована, распространена, опубликована, изменена, подвергнута обратному проектированию или использована в любых коммерческих или некоммерческих целях без явного предварительного письменного разрешения автора.

Любое несанкционированное использование, включая, помимо прочего, воспроизведение, распространение, модификацию, сублицензирование или публикацию, строго запрещено и может повлечь за собой судебное преследование.

Этот репозиторий предназначен исключительно для справочных целей и удобства автора. Он не лицензируется для публичного использования, внесения вклада или распространения.
`;

export default function LicenseModal({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      PaperProps={{
        sx: {
          width: 760,
          maxWidth: "94vw",
          height: "min(86vh, 860px)",
          borderRadius: "24px",
          backgroundImage: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        },
      }}
    >
      <Box
        sx={{
          p: { xs: 3, sm: 5 },
          // pb: 30,
          mb:2,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Лицензионное соглашение
        </Typography>
        <Typography
          variant="body1"
          sx={{ whiteSpace: "pre-line", lineHeight: 1.6 }}
        >
          {LICENSE_TEXT}
        </Typography>
      </Box>

      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          pb: 2,
          pt: 0,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          backgroundImage: (t) =>
            `linear-gradient(to top, ${alpha(t.palette.background.paper, 0.7)} 0%, ${alpha(t.palette.background.paper, 0.35)} 55%, ${alpha(t.palette.background.paper, 0)} 100%)`,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            px: 2.5,
            py: 0.75,
            borderRadius: "999px",
            bgcolor: "action.hover",
          }}
        >
          <Typography variant="body2" color="text.secondary" noWrap>
            Copyright © 2026 nebula.9371. Все права защищены.
          </Typography>
        </Box>
        <AppButton
          preset="primary"
          onClick={onClose}
          sx={{ px: 3, borderRadius: "999px" }}
        >
          Готово
        </AppButton>
      </Box>
    </Dialog>
  );
}
