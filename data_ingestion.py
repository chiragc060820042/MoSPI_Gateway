import pyreadstat
import time
import pandas as pd
import json

chunk_size = 500000  # adjust depending on RAM

main_path="D:\\1. Statathon 2025\\DDI-IND-MOSPI-NSS-HCES23-24\\datasets"
file_name="LEVEL - 02 (Section 3).sav"
full_path= main_path + file_name

reader = pyreadstat.read_file_in_chunks(pyreadstat.read_sav, full_path, chunksize=chunk_size)

for i, (df, meta) in enumerate(reader):
    mode = 'w' if i == 0 else 'a'  # write for first chunk, append later
    header = (i == 0)  # write header only for first chunk
    df.to_csv(file_name+".csv", mode=mode, header=header, index=False)


time.sleep(2)



df = pd.read_csv(file_name+".csv")

# Convert all column names to lowercase
df.columns = [col.lower() for col in df.columns]

# Save back to CSV
df.to_csv("lowercase_"+file_name+".csv", index=False)

#to Column_names str
column_names = ",".join(df.columns.tolist())

file_path = file_name+"_column_names.txt"

with open(file_path, 'w') as file:
    file.write(column_names)
    
    

dtypes_list = df.dtypes.tolist()
 
 

# Mapping dict
dtype_map = {
    'int64': 'BIGINT',
    'Int64': 'BIGINT',
    'int32': 'INTEGER',
    'Int32': 'INTEGER',
    'float64': 'DOUBLE PRECISION',
    'Float64': 'DOUBLE PRECISION',
    'float32': 'REAL',
    'bool': 'BOOLEAN',
    'boolean': 'BOOLEAN',
    'datetime64[ns]': 'TIMESTAMP',
    'timedelta64[ns]': 'INTERVAL',
    'object': 'TEXT',
    'string': 'TEXT',
    'category': 'TEXT'
}

def pandas_dtype_to_postgres(dtype):
    """Map pandas dtype to PostgreSQL type, using extension type name if available."""
    try:
        dtype_name = dtype.name
    except AttributeError:
        dtype_name = str(dtype)
    return dtype_map.get(dtype_name, 'TEXT')

#NOTE : df is dataframe which we want whose dtypes we want to be converted to string
# Generate mapping
pg_map = {col: pandas_dtype_to_postgres(dtype) for col, dtype in df.dtypes.items()}

print(pg_map)
#Change all columns of csv to lowercase

keys_list = [key for key in pg_map]

value_list =[pg_map[key] for key in pg_map]
dtypes = ",".join(value_list)

file_path = file_name+"_column_dtypes_in_str.txt"

with open(file_path, 'w') as file:
    file.write(dtypes)
    
   


column_list = column_names.split(",")
dtype_list = dtypes.split(",")

# Example mapping of constraints per column
'''constraints_map = {
    "id": ["PRIMARY KEY"],
    "name": ["NOT NULL"],
    "email": ["UNIQUE", "NOT NULL"],
    "age": ["CHECK (age >= 0)"]
} '''

# Build the list of column dicts
columns = []
for name, col_type in zip(column_list, dtype_list):
    column_data = {
        "name": name,
        "type": col_type#,
        #"constraints": constraints_map.get(name, [])
    }
    columns.append(column_data)

# Create final JSON structure
result = {"columns": columns}

# Pretty-print JSON
json_result = json.dumps(result, indent=2)
print(json_result)

edit_json = json.loads(json_result)
edit_json["if_not_exists"] = True
edit_json["dest_table"] = "public.HCES2024"+file_name

#Final raw json for dynamically create table RPC func
final_json_to_send = edit_json

#########################################################################################################
#Metadata for metadata table

from pandas.api.types import is_numeric_dtype
import numpy as np

#Take these three vars from user
survey_name = "Population Census"
survey_year = "2024"
survey_subset = "Urban"

data_info = {}

for col in df.columns:
    if is_numeric_dtype(df[col]):
        # Convert min and max to native Python int/float
        min_val = df[col].min()
        max_val = df[col].max()
        data_info[col] = [min_val.item() if isinstance(min_val, (np.integer, np.floating)) else min_val,
                          max_val.item() if isinstance(max_val, (np.integer, np.floating)) else max_val]
    else:
        enum_list = df[col].unique().tolist()
        data_info[col] = enum_list

print(data_info)

payload = {
    "survey_name": survey_name,
    "survey_year": survey_year,
    "survey_subset": survey_subset,
    "survey_column_names": column_list,
    "survey_column_data_types": dtype_list,
    "data_info": data_info
}

# Convert to JSON string
payload_json = json.dumps(payload, ensure_ascii=False)