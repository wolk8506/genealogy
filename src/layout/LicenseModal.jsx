import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export default function LicenseModal({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: "15px" } }}
      fullWidth
    >
      <DialogTitle>Лицензионное соглашение</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
          {`
Copyright © 2025 nebula.9371.  
All rights reserved.


This software and its associated source code are the intellectual property of the author. No part of this project may be copied, distributed, published, modified, reverse-engineered, or used in any commercial or non-commercial capacity without explicit, prior written permission from the author.

Any unauthorized use, including but not limited to reproduction, redistribution, modification, sublicensing, or publication, is strictly prohibited and may result in legal action.

This repository is intended solely for reference and convenience of the author. It is not licensed for public use, contribution, or distribution.

Данное программное обеспечение и связанный с ним исходный код являются интеллектуальной собственностью автора. Никакая часть данного проекта не может быть скопирована, распространена, опубликована, изменена, подвергнута обратному проектированию или использована в любых коммерческих или некоммерческих целях без явного предварительного письменного разрешения автора.

Любое несанкционированное использование, включая, помимо прочего, воспроизведение, распространение, модификацию, сублицензирование или публикацию, строго запрещено и может повлечь за собой судебное преследование.

Этот репозиторий предназначен исключительно для справочных целей и удобства автора. Он не лицензируется для публичного использования, внесения вклада или распространения.
`}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
