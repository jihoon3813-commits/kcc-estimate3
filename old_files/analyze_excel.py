
import pandas as pd
import json
import os

def analyze_excel(file_path):
    # Read the excel file
    # The user said the data is in 3-row blocks per item.
    # We need to find where the data starts.
    
    df = pd.read_excel(file_path, header=None)
    
    # Logic to find the starting row (usually after a header like '설치위치' or '순번')
    start_row = 0
    for i, row in df.iterrows():
        row_str = " ".join([str(x) for x in row.values])
        if "설치" in row_str and "위치" in row_str:
            start_row = i + 1
            break
    
    data_rows = df.iloc[start_row:]
    
    items = []
    total_material = 0
    total_etc = 0
    
    # Process in chunks of 3 rows
    for i in range(0, len(data_rows), 3):
        row1 = data_rows.iloc[i]
        if i + 1 < len(data_rows):
            row2 = data_rows.iloc[i+1]
        else:
            row2 = pd.Series([None] * len(row1))
            
        # Check if the row is valid (has a sequential number or location)
        # Column C (index 2) is '설치위치'
        loc = str(row1[2]).strip() if pd.notnull(row1[2]) else ""
        if not loc or loc == "nan":
            continue
            
        # Column A (index 0) is Row number, B is Product, C is Location
        # D is Width, E is Height, F is Type, G is Glass, H is Color, I is Handle, J is Spec
        # K is Qty, L is Thickness, M is Glass Type, N is Price
        
        # User's specific requirements:
        # L column: Row 1 = Inner Glass Thickness, Row 2 = Outer Glass Thickness
        # M column: Row 1 = Inner Glass Type, Row 2 = Outer Glass Type
        # (If Row 2 is empty, don't distinguish Outer)
        
        thick_in = str(row1[11]) if pd.notnull(row1[11]) else "" # L column
        thick_out = str(row2[11]) if pd.notnull(row2[11]) else ""
        
        glass_in = str(row1[12]) if pd.notnull(row1[12]) else "" # M column
        glass_out = str(row2[12]) if pd.notnull(row2[12]) else ""
        
        # Price: N column (index 13)
        price_raw = row1[13] if pd.notnull(row1[13]) else 0
        try:
            price = int(float(price_raw))
        except:
            price = 0
            
        # VAT 1.1 and truncate 100 units
        price_with_vat = int((price * 1.1) // 100 * 100)
        
        is_etc = "기타" in loc
        if is_etc:
            total_etc += price_with_vat
            spec_label = "구분"
            spec_value = str(row1[9]) if pd.notnull(row1[9]) else "" # J column (Spec/Model)
        else:
            total_material += price_with_vat
            spec_label = "모델명"
            spec_value = str(row1[9]) if pd.notnull(row1[9]) else ""

        items.append({
            "no": len(items) + 1,
            "loc": loc,
            "prod": str(row1[1]) if pd.notnull(row1[1]) else "",
            "size": f"{row1[3]}x{row1[4]}" if pd.notnull(row1[3]) and pd.notnull(row1[4]) else "",
            "spec_label": spec_label,
            "spec": spec_value,
            "thick_in": thick_in,
            "thick_out": thick_out if thick_out and thick_out != "nan" else "",
            "glass_in": glass_in,
            "glass_out": glass_out if glass_out and glass_out != "nan" else "",
            "price": price_with_vat,
            "is_etc": is_etc
        })
        
    result = {
        "items": items,
        "total_material": total_material,
        "total_etc": total_etc,
        "total_sum": total_material + total_etc
    }
    
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    file_name = "김기홍4_01063423880_260116_7.xlsx"
    analyze_excel(file_name)
