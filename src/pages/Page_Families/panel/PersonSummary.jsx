// pages/Page_Families/panel/PersonSummary.jsx
// Обзор выбранного человека в правой панели — в стиле вкладки «Связи»:
// шапка, кнопки как в модалках и группы строк SettingsRow.

import React, { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import { useNavigate } from "react-router-dom";
import PersonAvatar from "../../../components/PersonAvatar";
import DialogActionButton from "../../../components/Dialog/DialogActionButton";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../../Page_Settings/settingsUi";
import {
  ageText,
  dateToMs,
  formatYears,
  maidenLabel,
  personInitials,
  personName,
  toId,
  unionMetaLine,
  unionTitle,
} from "../../../utils/families/familyLabels";

function Section({ title, children }) {
  return (
    <Box>
      <Typography sx={sectionLabelSx}>{title}</Typography>
      <Box sx={groupSx}>
        <Stack divider={<RowDivider />}>{children}</Stack>
      </Box>
    </Box>
  );
}

function PersonRow({ person, onClick, trailing }) {
  const years = formatYears(person);
  const maiden = maidenLabel(person);

  return (
    <SettingsRow
      icon={
        <PersonAvatar
          personId={person.id}
          initials={personInitials(person)}
          size={32}
        />
      }
      title={personName(person)}
      subtitle={[years, maiden].filter(Boolean).join(" · ") || undefined}
      onClick={onClick ? () => onClick(toId(person.id)) : undefined}
      trailing={
        trailing || (
          <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        )
      }
    />
  );
}

function EventRow({ event }) {
  return (
    <SettingsRow
      icon={
        <RowIcon bg="orange">
          <EventRoundedIcon sx={{ fontSize: 18 }} />
        </RowIcon>
      }
      title={event.type || "Событие"}
      subtitle={
        [event.date, event.place].filter(Boolean).join(" · ") ||
        "дата не указана"
      }
    />
  );
}

export default function PersonSummary({
  person,
  byId,
  childrenOf,
  byPerson,
  onSelectPerson,
  onOpenFamily,
}) {
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!person) return null;

    const personId = toId(person.id);
    const resolve = (ids) =>
      (ids || [])
        .map((id) => byId.get(toId(id)))
        .filter(Boolean)
        .filter((item) => toId(item.id) !== personId);

    const parents = resolve([person.father, person.mother]);

    const childIds = new Set();
    for (const id of person.children || []) childIds.add(toId(id));
    for (const child of childrenOf.get(personId) || []) {
      childIds.add(toId(child.id));
    }
    const children = [...childIds].map((id) => byId.get(id)).filter(Boolean);

    const siblingIds = new Set();
    for (const parent of parents) {
      for (const child of childrenOf.get(toId(parent.id)) || []) {
        const id = toId(child.id);
        if (id && id !== personId) siblingIds.add(id);
      }
    }
    for (const id of person.siblings || []) {
      const key = toId(id);
      if (key && key !== personId) siblingIds.add(key);
    }
    const siblings = [...siblingIds].map((id) => byId.get(id)).filter(Boolean);

    const events = Array.isArray(person.events) ? person.events : [];
    const dated = events
      .filter((event) => event?.date)
      .sort((a, b) => dateToMs(b.date) - dateToMs(a.date));
    const undated = events.filter((event) => !event?.date);

    return {
      parents,
      spouses: resolve(person.spouse),
      children,
      siblings,
      unions: byPerson.get(personId) || [],
      events: [...dated, ...undated].slice(0, 3),
    };
  }, [person, byId, childrenOf, byPerson]);

  if (!person || !data) {
    return (
      <Box sx={groupSx}>
        <SettingsRow
          icon={
            <RowIcon bg="gray">
              <PersonOutlineRoundedIcon sx={{ fontSize: 18 }} />
            </RowIcon>
          }
          title="Человек не выбран"
          subtitle="Нажмите на карточку на схеме."
        />
      </Box>
    );
  }

  const years = formatYears(person);
  const age = ageText(person);
  const maiden = maidenLabel(person);

  const sections = [
    { title: "Родители", people: data.parents },
    { title: "Супруги", people: data.spouses },
    { title: "Дети", people: data.children },
    { title: "Братья и сёстры", people: data.siblings },
  ];

  const isEmpty =
    !data.parents.length &&
    !data.spouses.length &&
    !data.children.length &&
    !data.siblings.length &&
    !data.unions.length &&
    !data.events.length;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ px: 0.25, pt: 0.25 }}
      >
        <PersonAvatar
          personId={person.id}
          initials={personInitials(person)}
          size={52}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "-0.015em",
            }}
          >
            {personName(person)}
          </Typography>

          {maiden && (
            <Typography
              noWrap
              sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}
            >
              {maiden}
            </Typography>
          )}

          <Typography
            noWrap
            sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}
          >
            {[years, age].filter(Boolean).join(" · ") || "даты не указаны"}
          </Typography>

          {person.generation != null && (
            <Typography
              noWrap
              sx={{ fontSize: 11.5, color: "text.disabled", lineHeight: 1.4 }}
            >
              Поколение {person.generation}
              {person.archived ? " · в архиве" : ""}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <DialogActionButton
          tone="primary"
          startIcon={<OpenInNewRoundedIcon />}
          onClick={() => navigate(`/person/${person.id}`)}
          sx={{ flex: 1, minWidth: 0 }}
        >
          Профиль
        </DialogActionButton>

        <DialogActionButton
          tone="secondary"
          startIcon={<TimelineRoundedIcon />}
          onClick={() => navigate(`/timeline?person=${person.id}`)}
          sx={{ flex: 1, minWidth: 0 }}
        >
          Лента
        </DialogActionButton>
      </Stack>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {sections.map(({ title, icon, Icon, people }) =>
          people.length ? (
            <Section key={title} title={title}>
              {people.map((item) => (
                <PersonRow
                  key={item.id}
                  person={item}
                  onClick={onSelectPerson}
                />
              ))}
            </Section>
          ) : null,
        )}

        {data.unions.length > 0 && (
          <Section title="Союзы">
            {data.unions.map((family) => {
              const other = family.partners.find(
                (partner) => toId(partner.id) !== toId(person.id),
              );
              return (
                <SettingsRow
                  key={family.key}
                  icon={
                    <RowIcon bg="indigo">
                      <Diversity3RoundedIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title={
                    other
                      ? unionTitle({ partners: [person, other] })
                      : "Неполная семья"
                  }
                  subtitle={unionMetaLine(family) || "дата не указана"}
                  onClick={() => onOpenFamily?.(family.key)}
                  trailing={
                    <ChevronRightIcon
                      sx={{ fontSize: 16, color: "text.disabled" }}
                    />
                  }
                />
              );
            })}
          </Section>
        )}

        {data.events.length > 0 && (
          <Section title="События">
            {data.events.map((event, index) => (
              <EventRow key={`${event.type}-${index}`} event={event} />
            ))}
          </Section>
        )}

        {isEmpty && (
          <Box sx={groupSx}>
            <SettingsRow
              icon={
                <RowIcon bg="gray">
                  <PersonOutlineRoundedIcon sx={{ fontSize: 18 }} />
                </RowIcon>
              }
              title="Связи не указаны"
              subtitle="Добавьте родителей, супруга или детей в карточке человека."
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
