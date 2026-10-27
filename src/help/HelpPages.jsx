import { Fragment } from "react";
import { Box, ButtonBase, Divider, Typography } from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MarkdownViewer from "../components/MarkdownViewer";

const titleSx = {
  fontFamily: "inherit",
  fontWeight: 700,
  letterSpacing: "-0.022em",
};

function LinkButton({ children, onClick, colors, sx }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        fontFamily: "inherit",
        fontSize: 15,
        lineHeight: 1.4,
        color: colors.link,
        textAlign: "left",
        borderRadius: "4px",
        "&:hover": { textDecoration: "underline" },
        ...sx,
      }}
    >
      {children}
    </ButtonBase>
  );
}

function FeatureCard({ node, imageRight, onOpen, colors }) {
  const image = node.image && (
    <Box
      component="img"
      src={node.image}
      alt=""
      loading="lazy"
      onClick={onOpen}
      sx={{
        width: "48%",
        flexShrink: 0,
        aspectRatio: "16 / 10",
        objectFit: "cover",
        objectPosition: "top left",
        borderRadius: "10px",
        border: `1px solid ${colors.divider}`,
        cursor: "pointer",
        bgcolor: colors.control,
      }}
    />
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 5, py: 5 }}>
      {!imageRight && image}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="h2"
          onClick={onOpen}
          sx={{ ...titleSx, fontSize: 26, lineHeight: 1.2, mb: 1.5, cursor: "pointer" }}
        >
          {node.title}
        </Typography>
        {node.summary && (
          <Typography sx={{ fontFamily: "inherit", fontSize: 15, lineHeight: 1.55, mb: 1.5 }}>
            {node.summary}
          </Typography>
        )}
        <LinkButton onClick={onOpen} colors={colors}>
          Подробнее ›
        </LinkButton>
      </Box>
      {imageRight && image}
    </Box>
  );
}

function CardList({ nodes, onNavigate, colors }) {
  return nodes.map((node, index) => (
    <Fragment key={node.id}>
      <Divider sx={{ borderColor: colors.divider }} />
      <FeatureCard
        node={node}
        imageRight={index % 2 === 1}
        onOpen={() => onNavigate(node.id)}
        colors={colors}
      />
    </Fragment>
  ));
}

export function HelpHome({ guide, version, iconSrc, onNavigate, onShowSidebar, colors }) {
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 4, pb: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ ...titleSx, fontSize: 34, lineHeight: 1.15, mb: 1 }}>
            {guide.title}
          </Typography>
          <Typography sx={{ fontFamily: "inherit", fontSize: 17, color: colors.secondary, mb: 2.5 }}>
            {version ? `для Genealogy ${version}` : "для Genealogy"}
          </Typography>
          <LinkButton onClick={onShowSidebar} colors={colors} sx={{ gap: 0.75 }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 17 }} />
            Оглавление
          </LinkButton>
        </Box>
        {iconSrc && (
          <Box
            component="img"
            src={iconSrc}
            alt=""
            sx={{ width: 112, height: 112, objectFit: "contain", flexShrink: 0 }}
          />
        )}
      </Box>
      {guide.intro && (
        <Typography sx={{ fontFamily: "inherit", fontSize: 15, lineHeight: 1.55, pb: 4 }}>
          {guide.intro}
        </Typography>
      )}
      <CardList nodes={guide.nodes} onNavigate={onNavigate} colors={colors} />
    </>
  );
}

export function HelpGroup({ node, onNavigate, colors }) {
  return (
    <>
      <Typography component="h1" sx={{ ...titleSx, fontSize: 32, lineHeight: 1.15, mb: 2.5 }}>
        {node.title}
      </Typography>
      {node.body && (
        <Box sx={{ pb: 3 }}>
          <MarkdownViewer key={node.id} content={node.body} variant="apple-help" />
        </Box>
      )}
      <CardList nodes={node.children} onNavigate={onNavigate} colors={colors} />
    </>
  );
}

export function HelpTopic({ node, colors }) {
  return (
    <>
      <Typography component="h1" sx={{ ...titleSx, fontSize: 32, lineHeight: 1.15, mb: 2.5 }}>
        {node.title}
      </Typography>
      <MarkdownViewer key={node.id} content={node.body} variant="apple-help" />
      <Divider sx={{ borderColor: colors.divider, mt: 5 }} />
    </>
  );
}

function Highlight({ text, query, colors }) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let from = 0;
  let index = lower.indexOf(needle, from);
  while (index >= 0) {
    if (index > from) parts.push(text.slice(from, index));
    parts.push(
      <Box component="mark" key={index} sx={{ bgcolor: colors.mark, color: "inherit", borderRadius: "3px", px: "1px" }}>
        {text.slice(index, index + q.length)}
      </Box>,
    );
    from = index + q.length;
    index = lower.indexOf(needle, from);
  }
  parts.push(text.slice(from));
  return parts;
}

export function HelpSearchResults({ query, results, onNavigate, colors }) {
  return (
    <>
      <Typography component="h1" sx={{ ...titleSx, fontSize: 28, lineHeight: 1.2, mb: 1 }}>
        Результаты поиска
      </Typography>
      <Typography sx={{ fontFamily: "inherit", fontSize: 13, color: colors.secondary, mb: 3 }}>
        {results.length
          ? `Найдено тем: ${results.length} по запросу «${query.trim()}»`
          : `По запросу «${query.trim()}» ничего не найдено`}
      </Typography>
      {results.map(({ page, parent, snippet }) => (
        <Box key={page.id} sx={{ py: 1.75, borderTop: `1px solid ${colors.divider}` }}>
          <LinkButton onClick={() => onNavigate(page.id)} colors={colors} sx={{ fontWeight: 600 }}>
            <Highlight text={page.title} query={query} colors={colors} />
          </LinkButton>
          {parent && (
            <Typography sx={{ fontFamily: "inherit", fontSize: 12, color: colors.secondary, mt: 0.25 }}>
              {parent.title}
            </Typography>
          )}
          {snippet && (
            <Typography sx={{ fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, mt: 0.5 }}>
              <Highlight text={snippet} query={query} colors={colors} />
            </Typography>
          )}
        </Box>
      ))}
    </>
  );
}
