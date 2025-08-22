from pydantic import BaseModel
from typing import List

class EventLogProperties(BaseModel):
    """
    "event_log_properties": {
        'case_name' : 'CaseID',
        'concept_name' : 'Activity',
        'timestamp_name' : 'CompleteTimestamp',
        'date_format' : '%Y/%m/%d %H:%M:%S.%f',
        'time_since_case_start_column' : 'case_elapsed_time',
        'time_since_last_event_column' : 'event_elapsed_time',
        'day_in_week_column' : 'day_in_week',
        'seconds_in_day_column' : 'seconds_in_day',
        'min_suffix_size' : 5,
        'train_validation_size' : 0.15,
        'test_validation_size' : 0.2,
        'window_size' : 'auto',
        'categorical_columns' : ['Activity', 'Resource', 'VariantIndex', 'seriousness', 'customer', 'product', 'responsible_section', 'seriousness_2', 'service_level', 'service_type', 'support_section', 'workgroup'],
        'continuous_columns' : ['case_elapsed_time', 'event_elapsed_time', 'day_in_week', 'seconds_in_day', ],
        'continuous_positive_columns' : []}
    """
    case_name: str
    concept_name: str
    timestamp_name: str
    date_format: str
    time_since_case_start_column: str
    time_since_last_event_column: str
    day_in_week_column: str
    seconds_in_day_column: str
    min_suffix_size: int
    train_validation_size: float
    test_validation_size: float
    window_size: str
    categorical_columns: List[str] = []
    continuous_columns: List[str] = []
    continuous_positive_columns: List[str] = []

class EventLogRequest(BaseModel):
    """
    "event_log_name": str,       
    "event_log_properties": dict
    """
    event_log_name: str
    event_log_properties: EventLogProperties