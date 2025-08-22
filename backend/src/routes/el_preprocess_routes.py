import os
import torch
import numpy as np
import hashlib
import json
import warnings

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from starlette.responses import StreamingResponse
import zipstream

from models.el_preprocess import EventLogRequest
from event_log_loader.event_log_loader_logic import EventLogLoader

router = APIRouter()

GLOBAL_DEFAULT_EVENT_LOG_PROPERTIES = {
    "case_name": "",
    "concept_name": "",
    "timestamp_name": "",
    "date_format": "%Y/%m/%d %H:%M:%S.%f",
    "time_since_case_start_column": "case_elapsed_time",
    "time_since_last_event_column": "event_elapsed_time",
    "day_in_week_column": "day_in_week",
    "seconds_in_day_column": "seconds_in_day",
    "min_suffix_size": 5,
    "train_validation_size": 0.15,
    "test_validation_size": 0.2,
    "window_size": "auto",
    "categorical_columns": [],
    "continuous_columns": [],
    "continuous_positive_columns": []
}

DATA_DIR = "../data"

# ... (other imports)

DATA_DIR = "/app/data"  # Absolute path—works regardless of CWD

#
@router.get("/logs")
def get_available_logs():
    """
    - Return a list of all available event logs in ../data
    """
    
    if not os.path.exists(DATA_DIR):
        return {"logs": []}
    
    logs = [name for name in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, name))]
    return {"logs": logs}

#
@router.get("/log_props/{log_name}")
def get_log_properties(log_name: str):
    """
    - Return the default properties for a given event log
    """
    
    log_path = os.path.join(DATA_DIR, log_name)
    if not os.path.isdir(log_path):
        raise HTTPException(status_code=404, detail="Event log not found")

    props_path = os.path.join(log_path, "default_props.json")

    if os.path.exists(props_path):
        with open(props_path, "r") as f:
            properties = json.load(f)
    else:
        properties = GLOBAL_DEFAULT_EVENT_LOG_PROPERTIES

    return {"event_log_name": log_name,
            "properties": properties}
    
#
@router.post("/encode_event_log")
def encode(request: EventLogRequest):
    """
    Event log preparation, storing and loading
    """

    warnings.filterwarnings("ignore", category=FutureWarning)
    np.random.seed(17)

    # name of log and resulting encodings
    event_log_name = request.event_log_name
    
    result_name = event_log_name
    
    event_log_location = f"{DATA_DIR}/{event_log_name}/{event_log_name}.csv"
    event_log_properties = request.event_log_properties.model_dump()

    # hash input to detect existing files
    hash_input = json.dumps({
        "event_log_name": event_log_name,
        "encoded_result_name": result_name,
        "event_log_properties": event_log_properties
    }, sort_keys=True).encode("utf-8")
    request_hash = hashlib.md5(hash_input).hexdigest()

    out_dir = f"{DATA_DIR}/{event_log_name}/encoded"
    os.makedirs(out_dir, exist_ok=True)

    # filenames with hash (for storage)
    train_path_hash = os.path.join(out_dir, f"{result_name}_{request.event_log_properties.min_suffix_size}_{request_hash}_train.pkl")
    # print(train_path_hash)
    val_path_hash   = os.path.join(out_dir, f"{result_name}_{request.event_log_properties.min_suffix_size}_{request_hash}_val.pkl")
    test_path_hash  = os.path.join(out_dir, f"{result_name}_{request.event_log_properties.min_suffix_size}_{request_hash}_test.pkl")

    # filenames without hash (for user)
    train_file = f"{result_name}_{request.event_log_properties.min_suffix_size}_train.pkl"
    test_file  = f"{result_name}_{request.event_log_properties.min_suffix_size}_test.pkl"
    val_file   = f"{result_name}_{request.event_log_properties.min_suffix_size}_val.pkl"

    # If already cached, use it: 
    if not (os.path.isfile(train_path_hash) and os.path.isfile(val_path_hash) and os.path.isfile(test_path_hash)):
        event_log_loader = EventLogLoader(event_log_location, event_log_properties)

        train_dataset = event_log_loader.get_dataset("train")
        torch.save(train_dataset, train_path_hash)

        val_dataset = event_log_loader.get_dataset("val")
        torch.save(val_dataset, val_path_hash)

        test_dataset = event_log_loader.get_dataset("test")
        torch.save(test_dataset, test_path_hash)
    
    def iter_zip():
        z = zipstream.ZipFile(mode="w", compression=zipstream.ZIP_STORED)
        z.write(train_path_hash, arcname=train_file)
        z.write(val_path_hash, arcname=val_file)
        z.write(test_path_hash, arcname=test_file)
        for chunk in z:
            yield chunk

    return StreamingResponse(iter_zip(),
                         media_type="application/zip",
                         headers={"Content-Disposition": f"attachment; filename={result_name}.zip"})
    