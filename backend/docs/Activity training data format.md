# Activity Data Used In This Project

## Snapshot Frequency (Current Code)

- Training plan data is resampled every `15` seconds.
- Output timestamps are fixed steps: `0, 15, 30, 45, ...`.
- Values are interpolated to match exact 15-second points.

## Data Sent To Plan Generation

Endpoint builds payload like this:

```json
{
  "workoutFocus": "Base",
  "analysisData": [
    {
      "streams": {
        "dataPoints": [
          {
            "time": 0,
            "distance": 0.3,
            "speed": 0,
            "heartrate": 120,
            "grade": 0,
            "altitude": 221
          },
          {
            "time": 15,
            "distance": 0.3,
            "speed": 0,
            "heartrate": 110,
            "grade": 31.5,
            "altitude": 223.1
          }
        ],
        "splits": [
          {
            "km": 1,
            "avgSpeed": 19.28,
            "avgHeartrate": 139,
            "avgGrade": 3.09,
            "maxSpeed": 30.68,
            "minSpeed": 0
          },
          {
            "km": 2,
            "avgSpeed": 12.66,
            "avgHeartrate": 144,
            "avgGrade": -5.84,
            "maxSpeed": 26.06,
            "minSpeed": 0.08
          }
        ]
      },
      "activity": {
        "id": 123,
        "name": "Morning Ride",
        "type": "Ride",
        "distance": 25000,
        "moving_time": 3600,
        "elapsed_time": 3900,
        "total_elevation_gain": 220,
        "average_speed": 6.9,
        "max_speed": 13.2,
        "average_heartrate": 150,
        "max_heartrate": 178,
        "start_date": "2026-04-18T08:30:00Z"
      }
    }
  ]
}
```

## Notes (Current Mapping)

- `speed` in `dataPoints` is converted to `km/h`.
- Missing `speed`/`grade` are set to `0`.
- `heartrate` key name is exactly `heartrate`.

## Units (dataPoints)

- `time`: seconds from activity start
- `distance`: meters
- `speed`: km/h
- `heartrate`: bpm
- `grade`: percent slope (`%`)
- `altitude`: meters

## Units (activity)

- `distance`: meters
- `moving_time`: seconds
- `elapsed_time`: seconds
- `total_elevation_gain`: meters
- `average_speed`: m/s
- `max_speed`: m/s
- `average_heartrate`: bpm
- `max_heartrate`: bpm
- `start_date`: ISO 8601 UTC timestamp
