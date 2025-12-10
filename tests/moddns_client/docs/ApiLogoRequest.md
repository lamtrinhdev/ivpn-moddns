# ApiLogoRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**domains** | **List[str]** |  | 

## Example

```python
from moddns.models.api_logo_request import ApiLogoRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ApiLogoRequest from a JSON string
api_logo_request_instance = ApiLogoRequest.from_json(json)
# print the JSON string representation of the object
print(ApiLogoRequest.to_json())

# convert the object into a dict
api_logo_request_dict = api_logo_request_instance.to_dict()
# create an instance of ApiLogoRequest from a dict
api_logo_request_from_dict = ApiLogoRequest.from_dict(api_logo_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


