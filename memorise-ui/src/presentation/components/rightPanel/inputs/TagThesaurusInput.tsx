import React, { useState, useRef, useEffect, useCallback } from "react";
import { Autocomplete, Box, Chip, CircularProgress, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";

export type ThesaurusItem = {
  name: string;
  path?: string[];
  synonyms?: string[];
  keywordId?: number;
  parentId?: number;
  isPreferred?: boolean;
  depth?: number;
};

interface Props {
  onAdd: (name: string, keywordId?: number, parentId?: number) => void;
  fetchSuggestions: (query: string) => Promise<ThesaurusItem[]>;
  isThesaurusLoading?: boolean;
  restrictToThesaurus?: boolean;
  defaultRestrictToThesaurus?: boolean;
  placeholder?: string;
}

const DEBOUNCE_MS = 220;

const ThesaurusOption = React.memo(({ liProps, option }: { liProps: React.HTMLAttributes<HTMLLIElement>, option: ThesaurusItem }) => (
  <li {...liProps}>
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", py: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {typeof option.depth === "number" && option.depth > 0 && (
          <Box sx={{ display: "flex", gap: 0.3 }}>
            {Array.from({ length: option.depth }).map((_, i) => (
              <Box key={i} sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#94a3b8", opacity: 0.7 - i * 0.12 }} />
            ))}
          </Box>
        )}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{option.name}</Typography>
        {option.isPreferred === false && <Chip size="small" label="alias" sx={{ height: 16, fontSize: 9, bgcolor: alpha("#F57C00", 0.1), color: "#F57C00", fontWeight: 700 }} />}
      </Box>
      {option.path && option.path.length > 0 && <Typography sx={{ fontSize: 11, color: "#64748b", mt: 0.25 }}>{option.path.join(" › ")}</Typography>}
      {option.synonyms && option.synonyms.length > 0 && (
        <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {option.synonyms.slice(0, 4).map((s) => (
            <Chip key={s} size="small" label={s} sx={{ height: 18, fontSize: 10, bgcolor: "#f1f5f9", color: "#475569" }} />
          ))}
        </Box>
      )}
    </Box>
  </li>
));
ThesaurusOption.displayName = "ThesaurusOption";

const TagThesaurusInput: React.FC<Props> = ({
  onAdd, fetchSuggestions, restrictToThesaurus, defaultRestrictToThesaurus = false,
  placeholder = "Search thesaurus or add tag...", isThesaurusLoading = false,
}) => {
  const [value, setValue] = useState<string>("");
  const [options, setOptions] = useState<ThesaurusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const effectiveRestrict = restrictToThesaurus ?? defaultRestrictToThesaurus;
  const timerRef = useRef<number>(undefined!);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleInputChange = useCallback((_: React.SyntheticEvent, newInput: string) => {
    setValue(newInput);
    clearTimeout(timerRef.current);
    if (!newInput.trim()) return setOptions([]);

    timerRef.current = window.setTimeout(async () => {
      setLoading(true);
      try { setOptions(await fetchSuggestions(newInput)); }
      catch { setOptions([]); }
      finally { setLoading(false); }
    }, DEBOUNCE_MS);
  }, [fetchSuggestions]);

  const handleChange = useCallback((_: React.SyntheticEvent, val: ThesaurusItem | string | null) => {
    if (typeof val === "string") {
      if (!effectiveRestrict && val.trim()) onAdd(val.trim());
    } else if (val) {
      onAdd(val.name, val.keywordId, val.parentId);
    }
    setValue(""); setOptions([]);
  }, [effectiveRestrict, onAdd]);

  const handleSubmitFree = useCallback(() => {
    const name = value.trim();
    if (!name) return;
    onAdd(name); setValue(""); setOptions([]);
  }, [value, onAdd]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
      <Autocomplete<ThesaurusItem, false, false, boolean>
        sx={{ flex: 1, minWidth: 0 }} blurOnSelect value={null} options={options} loading={loading}
        freeSolo={!effectiveRestrict} filterOptions={(opts) => opts} inputValue={value}
        disabled={isThesaurusLoading} onChange={handleChange} onInputChange={handleInputChange}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        slotProps={{
          paper: { sx: { mt: 1, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #e2e8f0" } }
        }}
        renderOption={(props, option) => {
          const { key, ...restProps } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
          return <ThesaurusOption key={`${option.keywordId || 'noid'}::${option.name}`} liProps={restProps} option={option} />;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={isThesaurusLoading ? "Loading thesaurus..." : placeholder}
            size="small"
            InputProps={{
              ...params.InputProps,
              sx: { borderRadius: "30px", bgcolor: "#f8fafc", fontSize: 13, "& fieldset": { borderColor: "#e2e8f0" }, "&:hover fieldset": { borderColor: "#cbd5e1" }, "&.Mui-focused fieldset": { borderColor: "#1976D2" } },
              endAdornment: (
                <>
                  {loading || isThesaurusLoading ? <CircularProgress size={16} sx={{ mr: 1, color: "#94a3b8" }} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {/* This replaces the bottom-most IconButton code inside TagThesaurusInput.tsx */}
      {!effectiveRestrict && (
        <Tooltip title="Add custom tag">
          <span>
            <IconButton
              size="small"
              onClick={handleSubmitFree}
              disabled={!value.trim()}
              sx={{
                bgcolor: value.trim() ? alpha("#1976D2", 0.1) : "#f1f5f9",
                color: value.trim() ? "#1976D2" : "#94a3b8",
                width: 38,
                height: 38,
                flexShrink: 0,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: alpha("#1976D2", 0.2),
                  transform: "scale(1.05)"
                }
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export default TagThesaurusInput;