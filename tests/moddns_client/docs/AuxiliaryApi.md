# moddns.AuxiliaryApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**api_v1_auxiliary_logos_post**](AuxiliaryApi.md#api_v1_auxiliary_logos_post) | **POST** /api/v1/auxiliary/logos | Download brand logo(s) from Brandfetch


# **api_v1_auxiliary_logos_post**
> Dict[str, object] api_v1_auxiliary_logos_post(body)

Download brand logo(s) from Brandfetch

Download brand logo(s) from Brandfetch. Accepts a list of domains and returns a JSON object mapping each domain to its logo as a base64-encoded data URL. Errors for each domain are also included.

### Example


```python
import moddns
from moddns.models.api_logo_request import ApiLogoRequest
from moddns.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = moddns.Configuration(
    host = "http://localhost"
)


# Enter a context with an instance of the API client
with moddns.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = moddns.AuxiliaryApi(api_client)
    body = moddns.ApiLogoRequest() # ApiLogoRequest | Domains to fetch logos for

    try:
        # Download brand logo(s) from Brandfetch
        api_response = api_instance.api_v1_auxiliary_logos_post(body)
        print("The response of AuxiliaryApi->api_v1_auxiliary_logos_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AuxiliaryApi->api_v1_auxiliary_logos_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | [**ApiLogoRequest**](ApiLogoRequest.md)| Domains to fetch logos for | 

### Return type

**Dict[str, object]**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Map of domains to base64-encoded logo data URLs and errors |  -  |
**400** | Bad Request |  -  |
**404** | Not Found |  -  |
**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

