import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  MenuItem,
  Paper,
  CircularProgress,
  AppBar,
  Toolbar,
  CssBaseline,
  Grid,
  Tooltip,
  IconButton
} from "@mui/material";

import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export default function PreProcessingPage() {
  const TUM_BLUE = "#0066B1";

  const [eventLogs, setEventLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState("");
  const [eventLogProperties, setEventLogProperties] = useState(null);
  const [originalCategorical, setOriginalCategorical] = useState([]);
  const [originalContinuous, setOriginalContinuous] = useState([]);
  const [loading, setLoading] = useState(false);

  // Keep raw text states so the user can type trailing commas/spaces without the field being re-normalized immediately
  const [categoricalText, setCategoricalText] = useState("");
  const [continuousText, setContinuousText] = useState("");

  // Reusable style for larger TextFields
  const largeTextField = {
    '& .MuiInputBase-input': { fontSize: '1.3rem', padding: '14px 12px' },
    '& .MuiInputLabel-root': { fontSize: '1rem' },
  };

  // Load all available logs
  useEffect(() => {
    fetch("http://127.0.0.1:8000/logs/")
      .then((res) => res.json())
      .then((data) => setEventLogs(data.logs || []))
      .catch((err) => console.error("Error fetching logs:", err));
  }, []);

  // When a log is chosen, load its properties
  useEffect(() => {
    if (selectedLog) {
      fetch(`http://127.0.0.1:8000/log_props/${selectedLog}`)
        .then((res) => res.json())
        .then((data) => {
          // Save the loaded properties and also keep a copy of the original categorical/continuous lists
          setEventLogProperties(data.properties);

          // store originals so we can check for "added" values later
          setOriginalCategorical(data.properties.categorical_columns || []);
          setOriginalContinuous(data.properties.continuous_columns || []);

          // initialize raw text fields so users can edit freely
          setCategoricalText((data.properties.categorical_columns || []).join(", "));
          setContinuousText((data.properties.continuous_columns || []).join(", "));
        })
        .catch((err) => console.error("Error fetching log properties:", err));
    }
  }, [selectedLog]);

  const handleElPropertyChange = (e) => {
    const { name, value } = e.target;
    setEventLogProperties((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // New handler: accept raw text (keeps trailing commas/spaces while typing), but parse into an array for validation
  const handleElPropertyChangeArray = (name, rawValue) => {
    // If user types a comma immediately followed by a non-space, insert a space after the comma
    // Example: "a,b" -> "a, b". Trailing commas are preserved while typing.
    const displayValue = String(rawValue).replace(/,([^ ])/g, ", $1");

    // Split on commas or spaces (runs) to produce the array. This keeps behavior simple and avoids
    // regex escape issues in replacement tooling.
    const parts = displayValue
      .split(/[, ]+/) // split on runs of commas or spaces
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    // update the raw text state so the input keeps exactly what the user typed (with automatic spaces after commas)
    if (name === "categorical_columns") setCategoricalText(displayValue);
    if (name === "continuous_columns") setContinuousText(displayValue);

    // update the parsed array in eventLogProperties for validation and submission
    setEventLogProperties((prev) => ({
      ...prev,
      [name]: parts,
    }));
  };

  // Validation helpers
  const getAddedItems = (original = [], current = []) => {
    // return items that are in current but not in original
    if (!Array.isArray(original) || !Array.isArray(current)) return [];
    return current.filter((c) => !original.includes(c));
  };

  const categoricalAdded = useMemo(() => getAddedItems(originalCategorical, eventLogProperties?.categorical_columns || []), [originalCategorical, eventLogProperties]);
  const continuousAdded = useMemo(() => getAddedItems(originalContinuous, eventLogProperties?.continuous_columns || []), [originalContinuous, eventLogProperties]);

  const validationSizeError = useMemo(() => {
    if (!eventLogProperties) return null;
    const val = parseFloat(eventLogProperties.train_validation_size);
    if (Number.isNaN(val)) return "Validation size must be a number between 0 and 1.";
    if (val < 0 || val > 1) return "Validation size must be between 0 and 1.";
    return null;
  }, [eventLogProperties]);

  const testSizeError = useMemo(() => {
    if (!eventLogProperties) return null;
    const val = parseFloat(eventLogProperties.test_validation_size);
    if (Number.isNaN(val)) return "Test size must be a number between 0 and 1.";
    if (val < 0 || val > 1) return "Test size must be between 0 and 1.";
    return null;
  }, [eventLogProperties]);

  const minSuffixError = useMemo(() => {
    if (!eventLogProperties) return null;
    const val = parseInt(eventLogProperties.min_suffix_size, 10);
    if (Number.isNaN(val)) return "Minimum suffix length must be an integer between 1 and 10.";
    if (val < 1 || val > 10) return "Minimum suffix length must be between 1 and 10.";
    return null;
  }, [eventLogProperties]);

  const categoricalError = useMemo(() => {
    if (!eventLogProperties) return null;
    if (categoricalAdded.length === 0) return null;
    return `The following categorical values are not in the original list: ${categoricalAdded.join(", ")}`;
  }, [eventLogProperties, categoricalAdded]);

  const continuousError = useMemo(() => {
    if (!eventLogProperties) return null;
    if (continuousAdded.length === 0) return null;
    return `The following continuous values are not in the original list: ${continuousAdded.join(", ")}`;
  }, [eventLogProperties, continuousAdded]);

  // Strict behavior: added values are always treated as errors (must be removed to enable submission)
  const hasErrors = useMemo(() => {
    return Boolean(categoricalError || continuousError || validationSizeError || testSizeError || minSuffixError);
  }, [categoricalError, continuousError, validationSizeError, testSizeError, minSuffixError]);

  // Submit to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLog) {
      alert("Please select an event log.");
      return;
    }

    if (hasErrors) {
      // show friendly message and don't submit
      alert("Please fix the highlighted errors before submitting.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        event_log_name: selectedLog,
        event_log_properties: eventLogProperties,
      };

      const response = await fetch("http://127.0.0.1:8000/encode_event_log/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Encoding failed");

      // Response is a ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedLog}_encoded.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Error during processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh", // makes footer stick to bottom
        bgcolor: "#f5f5f5ff" //light grey background
      }}
    >

      <CssBaseline />

      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: TUM_BLUE }}>
        <Toolbar sx={{ minHeight: 32, py: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Event Log Selection, Preparation and Loading for Neural Network Input
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            component="img"
            src="/TUM_Web_Logo_neg/TUM_Web_Logo_neg.png"
            alt="TUM Logo"
            sx={{ height: 45 }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 6 }}>
        
        {/* Step 1 */}
        <Paper elevation={6} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
            Step 1: Select the event log
            
            <Tooltip title="Choose the event log to encode" arrow sx={{ fontSize: 200 }}>
              <IconButton size="small" sx={{ ml: 3 }}>
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3,  fontSize: "1.5rem"}}>
            Choose the event log, you want to prepare.
          </Typography>

          <TextField
            select
            label="Event Log"
            value={selectedLog}
            onChange={(e) => setSelectedLog(e.target.value)}
            fullWidth
            variant="outlined"
            sx={largeTextField}
          >
            {eventLogs.map((log) => (
              <MenuItem key={log} value={log} sx={{ fontSize: "1.3rem" }}>
                {log}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        {/* Step 2: Properties */}
        {eventLogProperties && (
          <>
            {/* Step 2.1: Standard Inputs */}
            <Paper elevation={6} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
                Step 2.1: Event log specific inputs
                
                <Tooltip title="Based on your chosen log these fields are already filled out!" arrow>
                  <IconButton size="small" sx={{ ml: 3 }}>
                    <HelpOutlineIcon />
                  </IconButton>
                </Tooltip>
              
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3,  fontSize: "1.5rem"}}>
                Fixed, standard parameters for chosen log.
              </Typography>

              <Grid container spacing={3} wrap="wrap" sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Case Name"
                    value={eventLogProperties.case_name}
                    disabled
                    fullWidth 
                    variant="outlined"
                    sx={largeTextField}/>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Event label"
                    value={eventLogProperties.concept_name}
                    disabled
                    fullWidth 
                    variant="outlined"
                    sx={largeTextField}/>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Timestamp Name"
                    value={eventLogProperties.timestamp_name}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={largeTextField} />
                </Grid>
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: "1.5rem" }}>
                Other event log properties.
              </Typography>

              <Grid container spacing={3} wrap="wrap">
                <Grid item xs={2}>
                  <TextField 
                    label="Date Format"
                    value={eventLogProperties.date_format}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={largeTextField} />
                </Grid>
                <Grid item xs={2}>
                  <TextField 
                    label="Time since case start column"
                    value={eventLogProperties.time_since_case_start_column}
                     disabled
                    fullWidth
                    variant="outlined"
                    sx={largeTextField}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField 
                    label="Time since last event column"
                    value={eventLogProperties.time_since_last_event_column}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={largeTextField} 
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField 
                    label="Day in week column"
                    value={eventLogProperties.day_in_week_column} 
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={largeTextField} 
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField 
                    label="Seconds in day column"
                    value={eventLogProperties.seconds_in_day_column}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={largeTextField} 
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Step 2.2: Custom Inputs */}
            <Paper elevation={6} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
                Step 2.2: Custom inputs
                
                <Tooltip title="Fill out the following specifications." arrow>
                  <IconButton size="small" sx={{ ml: 3 }}>
                    <HelpOutlineIcon />
                  </IconButton>
                </Tooltip>
              
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3,  fontSize: "1.5rem"}}>
                Configure parameters for custom encoding.
              </Typography>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Validation set size"
                    name="train_validation_size"
                    value={eventLogProperties.train_validation_size}
                    onChange={handleElPropertyChange}
                    variant="outlined"
                    sx={largeTextField}
                    fullWidth
                    type="number"
                    inputProps={{ step: "0.01", min: 0, max: 1 }}
                    error={Boolean(validationSizeError)}
                    helperText={validationSizeError || "Fraction between 0 and 1 (inclusive)."}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Test set size"
                    name="test_validation_size"
                    value={eventLogProperties.test_validation_size}
                    onChange={handleElPropertyChange}
                    variant="outlined"
                    sx={largeTextField}
                    fullWidth
                    type="number"
                    inputProps={{ step: "0.01", min: 0, max: 1 }}
                    error={Boolean(testSizeError)}
                    helperText={testSizeError || "Fraction between 0 and 1 (inclusive)."}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Minimum suffix length"
                    name="min_suffix_size"
                    value={eventLogProperties.min_suffix_size}
                    onChange={handleElPropertyChange}
                    variant="outlined"
                    sx={largeTextField}
                    fullWidth
                    type="number"
                    inputProps={{ step: "1", min: 1, max: 10 }}
                    error={Boolean(minSuffixError)}
                    helperText={minSuffixError || "Integer between 1 and 10."}
                  />
                </Grid>
              </Grid>

              <Grid item xs={6} sx={{ mb: 3 }}>
                <TextField
                  label="Categorical values to encode"
                  name="categorical_columns"
                  value={categoricalText}
                  onChange={(e) => handleElPropertyChangeArray("categorical_columns", e.target.value)}
                  fullWidth
                  variant="outlined"
                  sx={largeTextField}
                  multiline
                  minRows={2}
                  maxRows={5}
                  error={Boolean(categoricalError)}
                  helperText={categoricalError || "List of categorical column names separated by commas or spaces. Any name not in the original list will be treated as an error and block submission."}
                />
              </Grid>

              <Grid item xs={6} sx={{ mb: 3 }}>
                <TextField
                  label="Continuous values to encode"
                  name="continuous_columns"
                  value={continuousText}
                  onChange={(e) => handleElPropertyChangeArray("continuous_columns", e.target.value)}
                  variant="outlined"
                  sx={largeTextField}
                  multiline
                  minRows={2}
                  maxRows={5}
                  fullWidth
                  error={Boolean(continuousError)}
                  helperText={continuousError || "List of continuous column names separated by commas or spaces. Any name not in the original list will be treated as an error and block submission."}
                />
              </Grid>

            </Paper>

            {/* Start Button */}
            <Box mt={4} display="flex" justifyContent="center">
              <Button
                type="button"
                variant="contained"
                sx={{
                  px: 3,
                  py: 2,
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  backgroundColor: TUM_BLUE,
                  "&:hover": { backgroundColor: "#004C80" },
                }}
                onClick={handleSubmit}
                disabled={loading || hasErrors}
              >
                Start data preparation
              </Button>
            </Box>

            {/* Loader */}
            {loading && (
              <Box mt={4} display="flex" flexDirection="column" alignItems="center">
                <CircularProgress sx={{ color: TUM_BLUE }} />
                <Typography mt={2} sx={{ fontSize: "1.2rem" }}>
                  Data preparation and loading!
                </Typography>
                <Typography mt={2} sx={{ fontSize: "1.2rem" }}>
                  Processing... Please wait, this may take a while.
                </Typography>
              </Box>
            )}
          </>
        )}
      
      </Container>

      {/* Footer - reduced height */}
      <Box component="footer" sx={{ py: 2, mt: "auto", backgroundColor: TUM_BLUE, color: "white", textAlign: "center"}}>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Chair of Information Systems and Business Process Management, TUM School of Computation, Information and Technology, Technical University of Munich &copy; {new Date().getFullYear()}
        </Typography>
        <Typography variant="body2">
          Contact: henryk.mustroph@tum.de
        </Typography>
      </Box>
    

    </Box>
  );

}
