// header.h: 표준 시스템 포함 파일
// 또는 프로젝트 특정 포함 파일이 들어 있는 포함 파일입니다.
//

#pragma once

#include "targetver.h"
#define WIN32_LEAN_AND_MEAN             // 거의 사용되지 않는 내용을 Windows 헤더에서 제외합니다.
#define NOMINMAX						// Windows.h의 max, min 매크로를 무시함

// Windows 헤더 파일
#include <windows.h>

// GDI+ 헤더 파일
#include <objidl.h>
#include <gdiplus.h>
#pragma comment(lib, "Gdiplus.lib")

// C 런타임 헤더 파일입니다.
#include <malloc.h>
#include <memory.h>
#include <tchar.h>

// 필요한 추가 헤더
#include <array>
#include <list>
#include <vector>
#include <map>
#include <unordered_map>
#include <string>
#include <algorithm>
#include <cmath>
#include <codecvt>
#include <locale>
#include <functional>

// 최우선으로 프로젝트의 공통 헤더들을 포함합니다. (예: 로그, 유틸리티 함수 등)
#include "Core/Base/Bases.h"
#include "Core/Base/UtilityFunctions.h"

#include "Core/Base/Defines.h"
#include "Core/Interface/Interfaces.h"
#include "Core/Math/MathFunctions.h"


#include "Core/Math/Random.h"
#include "Core/Math/Geometry2D.h"
#include "Core/Math/Vector3.h"

// 정의 자료형들도 Extern 변수로 사용할 수 있기 때문에 여기에서 포함
#include "Core/Base/Extern.h"
#include "Core/Base/DrawFunctions.h"

#include "EngineSystems/Input/InputManager.h"
#include "EngineSystems/Timer/Timer.h"

#include "Common/CommonGamePlayType.h"
#include "Common/CommonGamePlayDefine.h"
#include "Common/CommonGamePlayFunctions.h"

#include "GamePlaySystems/UserProfile.h"
#include "GamePlaySystems/GameState.h"
#include "GamePlaySystems/RunState.h"