import { Divider, Box } from "@mui/material";
import { RenderPersonItem } from "./RenderPersonItem";

export const RenderSectionParent = ({ title, people }) => {
  if (!people || people.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: people.length > 1 ? "720px" : "400px",
        ml: "auto !important",
        mr: "auto !important",
        mb: "-20px",
      }}
    >
      {/* первый элемент */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "320px",
        }}
      >
        <Divider
          orientation="vertical"
          sx={{
            height: "30px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
            },
            textTransform: "uppercase",
            color: "text.disabled",
          }}
        >
          {people[0].gender === "male" ? "Отец" : "Мать"}
        </Divider>
        {<RenderPersonItem p={people[0]} link={true} />}

        <Divider
          orientation="vertical"
          sx={{
            height: "30px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
            },
          }}
        ></Divider>
      </Box>

      {/* если есть второй — вставляем линию и второй элемент */}
      {people.length > 1 && (
        <>
          <Box width={1}>
            <Box height={30}></Box>
            <Divider></Divider>
            <Box height={30}></Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: "320px",
            }}
          >
            <Divider
              orientation="vertical"
              sx={{
                height: "30px",
                "& .MuiDivider-wrapper": {
                  padding: "0 8px",
                },
                textTransform: "uppercase",
                color: "text.disabled",
              }}
            >
              {people[1].gender === "male" ? "Отец" : "Мать"}
            </Divider>
            {<RenderPersonItem p={people[1]} link={true} />}

            <Divider
              orientation="vertical"
              sx={{
                height: "30px",
              }}
            ></Divider>
          </Box>
        </>
      )}
    </Box>
  );
};
