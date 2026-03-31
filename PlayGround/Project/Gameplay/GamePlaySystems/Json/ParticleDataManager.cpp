#include "framework.h"
#include "ParticleDataManager.h"

//// 문자열을 EaseType 열거형으로 변환하는 헬퍼 함수
//_MathFunc::EaseType StringToEaseType(const std::string& str) {
//	if (str == "Linear") return _MathFunc::EaseType::Linear;
//	if (str == "InQuad") return _MathFunc::EaseType::InQuad;
//	if (str == "OutQuad") return _MathFunc::EaseType::OutQuad;
//	if (str == "InOutQuad") return _MathFunc::EaseType::InOutQuad;
//	if (str == "InCubic") return _MathFunc::EaseType::InCubic;
//	if (str == "OutCubic") return _MathFunc::EaseType::OutCubic;
//	if (str == "InBack") return _MathFunc::EaseType::InBack;
//	if (str == "OutBack") return _MathFunc::EaseType::OutBack;
//	if (str == "InElastic") return _MathFunc::EaseType::InElastic;
//	if (str == "OutElastic") return _MathFunc::EaseType::OutElastic;
//	return _MathFunc::EaseType::Linear;
//}