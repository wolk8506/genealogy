import { FixedSizeGrid as Grid } from "react-window";
import PhotoItem from "./PhotoItem";

export default function VirtualPhotoGrid({ photos, photoPaths, onOpen }) {
  const columnCount = 4;
  const itemSize = 220;
  const rowCount = Math.ceil(photos.length / columnCount);

  return (
    <Grid
      columnCount={columnCount}
      rowCount={rowCount}
      columnWidth={itemSize}
      rowHeight={itemSize}
      height={window.innerHeight - 200}
      width={columnCount * itemSize}
    >
      {({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * columnCount + columnIndex;
        const photo = photos[index];
        if (!photo) return null;
        return (
          <div style={style}>
            <PhotoItem
              photo={photo}
              path={photoPaths[photo.id]}
              onOpen={onOpen}
            />
          </div>
        );
      }}
    </Grid>
  );
}
