import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { RowIcon, SettingsRow, groupSx, sectionLabelSx } from "./settingsUi";

const personName = (person) =>
  [person?.firstName, person?.lastName || person?.maidenName]
    .filter(Boolean)
    .join(" ") || "Без имени";

const personLabel = (person) => `${person.id} :: ${personName(person)}`;

// «Это я»: карточка пользователя в библиотеке. От неё по умолчанию
// строится дерево, поэтому выбор живёт в настройках, а не на карточке.
export function HomePersonCard({ cardStyle }) {
  const homePersonId = useSettingsStore(
    (state) => state.appSettings.homePersonId,
  );
  const setHomePersonId = useSettingsStore((state) => state.setHomePersonId);

  const [people, setPeople] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    window.peopleAPI.getAll().then((list) => {
      if (cancelled) return;
      const available = (list || [])
        .filter((person) => person && !person.archived)
        .sort((a, b) => Number(a.id) - Number(b.id));
      setPeople(available);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const homePerson = useMemo(
    () =>
      people.find((person) => String(person.id) === String(homePersonId)) ||
      null,
    [people, homePersonId],
  );

  const select = (personId) => {
    setAnchorEl(null);
    setHomePersonId(personId);
  };

  const valueLabel = !loaded
    ? "Загрузка…"
    : homePerson
      ? personLabel(homePerson)
      : homePersonId
        ? `ID ${homePersonId}`
        : "Не назначено";

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        borderRadius: "16px",
        border: "none",
        bgcolor: "transparent",
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <Box sx={{ mt: "9px", flexShrink: 0 }}>
          <RowIcon bg="indigo">
            <PersonPinCircleIcon sx={{ fontSize: 18 }} />
          </RowIcon>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            Это я
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mt: 0.25,
              lineHeight: 1.45,
              whiteSpace: "normal"
            }}>
            Ваша карточка в этой библиотеке. От неё по умолчанию строится
            дерево, а в карточке человека видна отметка «Это я». Корень дерева
            можно сменить правым кликом.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Typography sx={sectionLabelSx}>Моя карточка</Typography>
        <Box sx={groupSx}>
          <SettingsRow
            title="Кто я"
            subtitle="Дерево по умолчанию строится от этой карточки"
            disabled={!loaded}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            trailing={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  noWrap
                  color={homePerson ? "text.primary" : "text.secondary"}
                  sx={{
                    maxWidth: 300,
                    fontSize: "0.8125rem",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {valueLabel}
                </Typography>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "action.hover",
                    flexShrink: 0,
                  }}
                >
                  <UnfoldMoreIcon
                    sx={{ fontSize: 16, color: "text.secondary" }}
                  />
                </Box>
              </Box>
            }
          />
        </Box>

        {loaded && homePersonId && !homePerson && (
          <Typography
            variant="caption"
            sx={{
              color: "warning.main",
              display: "block",
              mt: 1,
              ml: 0.5
            }}>
            Карточка с ID {homePersonId} не найдена в этой библиотеке — выберите
            человека заново.
          </Typography>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 340,
              maxWidth: 480,
              maxHeight: 380,
              borderRadius: "12px",
            },
          },

          list: { dense: true, sx: { py: 0.5 } }
        }}>
        <MenuItem
          selected={!homePersonId}
          onClick={() => select(null)}
          sx={{ borderRadius: "8px", mx: 0.5 }}
        >
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Не назначено
          </Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        {people.map((person) => (
          <MenuItem
            key={person.id}
            selected={String(person.id) === String(homePersonId)}
            onClick={() => select(person.id)}
            sx={{ borderRadius: "8px", mx: 0.5 }}
          >
            <Typography
              variant="body2"
              noWrap
              sx={{ fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}
            >
              {personLabel(person)}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
}
