#!/usr/bin/env python3
"""
Backend API Testing for Moodle-like Virtual Classroom Platform
Tests all authentication, course management, and section APIs
"""

import requests
import sys
import json
from datetime import datetime

class VirtualClassroomAPITester:
    def __init__(self, base_url="https://eduplatform-71.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from requirements
        self.test_credentials = {
            "admin": {"email": "admin@aulavirtual.com", "password": "Demo2024!"},
            "teacher": {"email": "profesor@aulavirtual.com", "password": "Demo2024!"},
            "student": {"email": "estudiante1@aulavirtual.com", "password": "Demo2024!"}
        }

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}", {}

            success = response.status_code == expected_status
            response_json = {}
            
            try:
                response_json = response.json()
            except:
                response_json = {"raw_response": response.text}

            return success, f"Status: {response.status_code}", response_json

        except requests.exceptions.Timeout:
            return False, "Request timeout", {}
        except requests.exceptions.ConnectionError:
            return False, "Connection error", {}
        except Exception as e:
            return False, f"Request error: {str(e)}", {}

    def test_health_check(self):
        """Test basic API health"""
        success, details, response = self.make_request('GET', '', expected_status=200)
        self.log_test("API Health Check", success, details, response)
        return success

    def test_login(self, role="admin"):
        """Test login with specified role credentials"""
        creds = self.test_credentials[role]
        success, details, response = self.make_request(
            'POST', 'auth/login', 
            data=creds, 
            expected_status=200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test(f"Login as {role}", True, f"Token received: {self.token[:20]}...")
            return True
        else:
            self.log_test(f"Login as {role}", False, details)
            return False

    def test_get_current_user(self):
        """Test GET /api/auth/me"""
        success, details, response = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'email' in response:
            self.log_test("Get Current User Info", True, f"User: {response.get('email')}")
            return response
        else:
            self.log_test("Get Current User Info", False, details)
            return None

    def test_list_courses(self):
        """Test GET /api/courses"""
        success, details, response = self.make_request('GET', 'courses', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("List Courses", True, f"Found {len(response)} courses")
            return response
        else:
            self.log_test("List Courses", False, details)
            return []

    def test_list_courses_with_filters(self):
        """Test GET /api/courses with filters"""
        # Test with status filter
        success, details, response = self.make_request(
            'GET', 'courses?status=published', expected_status=200
        )
        
        if success and isinstance(response, list):
            self.log_test("List Courses with Status Filter", True, f"Found {len(response)} published courses")
        else:
            self.log_test("List Courses with Status Filter", False, details)

        # Test with search filter
        success, details, response = self.make_request(
            'GET', 'courses?search=Ciberseguridad', expected_status=200
        )
        
        if success and isinstance(response, list):
            self.log_test("List Courses with Search Filter", True, f"Found {len(response)} courses matching search")
        else:
            self.log_test("List Courses with Search Filter", False, details)

    def test_get_single_course(self, course_id):
        """Test GET /api/courses/{courseId}"""
        success, details, response = self.make_request(
            'GET', f'courses/{course_id}', expected_status=200
        )
        
        if success and 'id' in response:
            self.log_test("Get Single Course", True, f"Course: {response.get('fullname', 'Unknown')}")
            return response
        else:
            self.log_test("Get Single Course", False, details)
            return None

    def test_create_course(self):
        """Test POST /api/courses"""
        course_data = {
            "fullname": "Test Course API",
            "shortname": f"TEST-API-{datetime.now().strftime('%H%M%S')}",
            "category_id": "default-category",
            "summary": "Test course created via API testing",
            "format": "topics",
            "num_sections": 3,
            "visible": True,
            "status": "draft"
        }
        
        success, details, response = self.make_request(
            'POST', 'courses', data=course_data, expected_status=201
        )
        
        if success and 'id' in response:
            self.log_test("Create New Course", True, f"Created course: {response.get('shortname')}")
            return response
        else:
            self.log_test("Create New Course", False, details)
            return None

    def test_update_course(self, course_id):
        """Test PATCH /api/courses/{courseId}"""
        update_data = {
            "summary": "Updated summary via API test",
            "visible": False
        }
        
        success, details, response = self.make_request(
            'PATCH', f'courses/{course_id}', data=update_data, expected_status=200
        )
        
        if success and 'id' in response:
            self.log_test("Update Course", True, f"Updated course: {course_id}")
            return response
        else:
            self.log_test("Update Course", False, details)
            return None

    def test_get_course_sections(self, course_id):
        """Test GET /api/courses/{courseId}/sections"""
        success, details, response = self.make_request(
            'GET', f'courses/{course_id}/sections', expected_status=200
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Course Sections", True, f"Found {len(response)} sections")
            return response
        else:
            self.log_test("Get Course Sections", False, details)
            return []

    def test_list_categories(self):
        """Test GET /api/categories"""
        success, details, response = self.make_request('GET', 'categories', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("List Categories", True, f"Found {len(response)} categories")
            return response
        else:
            self.log_test("List Categories", False, details)
            return []

    def run_comprehensive_test(self):
        """Run all backend API tests"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print("=" * 60)
        
        # 1. Health check
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False
        
        # 2. Authentication tests
        print("\n📋 Testing Authentication APIs...")
        if not self.test_login("admin"):
            print("❌ Admin login failed. Stopping tests.")
            return False
        
        user_info = self.test_get_current_user()
        if not user_info:
            print("❌ Cannot get user info. Stopping tests.")
            return False
        
        # Test other role logins
        original_token = self.token
        self.test_login("teacher")
        self.test_login("student")
        self.token = original_token  # Restore admin token
        
        # 3. Course management tests
        print("\n📚 Testing Course Management APIs...")
        courses = self.test_list_courses()
        self.test_list_courses_with_filters()
        
        # Test with existing course if available
        test_course_id = None
        if courses:
            test_course_id = courses[0]['id']
            self.test_get_single_course(test_course_id)
            self.test_get_course_sections(test_course_id)
        
        # Test course creation and update (admin only)
        new_course = self.test_create_course()
        if new_course:
            test_course_id = new_course['id']
            self.test_update_course(test_course_id)
            self.test_get_course_sections(test_course_id)
        
        # 4. Categories test
        print("\n🏷️ Testing Categories API...")
        self.test_list_categories()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = VirtualClassroomAPITester()
    
    try:
        success = tester.run_comprehensive_test()
        
        # Save detailed results
        with open('/app/test_reports/backend_api_results.json', 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                "results": tester.test_results
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())