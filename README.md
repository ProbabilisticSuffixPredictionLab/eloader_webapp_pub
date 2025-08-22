# ELoader: A Web Application for Event Log Selection and Preparation for Neural Networks
Abstract: One essential step in building reproducible and comparable results in deep learning while also supporting custom neural network designs, is unified data selection and preparation. In the case of process monitoring, this specifically refers to event log selection and preparation. However, only a limited number of methods, approaches, and practical tools currently support unified event log selection and preparation. 

Therefore, we present ELoader, a prototypical web application that allows users to select an event log, prepares it, and download the resulting train, validation and test sets as a .zip package, ready for direct use in neural networks for process monitoring applications.

## Quick start
1. Create `backend/data/<logname>/` and put your CSV event log and `default_props.json` inside.
   - An example is given in `backend/data_example/<logname>/`
   - Important: The event log and the directory name must match.
   - Fill out the credentials in `default_props.json` carefully.
   - Do not change these to fields: `time_since_case_start_column: case_elapsed_time` and `time_since_last_event_column: event_elapsed_time`.
   - You can always add `case_elapsed_time` and `event_elapsed_time`to `continuous_columns`.

2. From project root (`event_log_loader_web_app`) run:
```bash
# preferred
docker compose up -d --build
```

```bash
# or (older systems)
docker-compose up -d --build
```

## Authors
Henryk Mustrop, Michel Kunkler, Stefanie Rinderle-Ma

## Contact
```bash
henryk.mustroph@tum.de
```
