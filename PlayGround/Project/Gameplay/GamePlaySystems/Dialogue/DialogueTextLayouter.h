#pragma once

#include <string>
#include <vector>

/**
 * @brief 다이얼로그 본문을 페이지 단위로 분할하기 위한 범위 정보
 */
struct DialoguePageRange
{
	_int start_index_ = 0;
	_int end_index_ = 0; // exclusive
};

/**
 * @brief 다이얼로그 본문을 렌더 영역 기준으로 페이지 분할하는 도우미 클래스
 *
 * 책임:
 * - 주어진 텍스트가 지정된 본문 영역 안에 몇 페이지로 들어가는지 계산
 * - 각 페이지의 문자 범위(start/end)를 계산
 *
 * 비책임:
 * - 실제 렌더링
 * - 타이핑 진행
 * - 세션 상태 전이
 */
class DialogueTextLayouter
{
public:
	/**
	 * @brief 본문을 페이지 범위 목록으로 분할한다.
	 * @param _text 원본 전체 텍스트
	 * @param _max_width 본문 영역 너비
	 * @param _max_height 본문 영역 높이
	 * @param _font_size 본문 폰트 크기
	 * @param _style_bitmask 본문 폰트 스타일
	 * @param _out_pages 계산 결과 페이지 목록
	 */
	static void BuildPages(
		const std::wstring& _text,
		_float _max_width,
		_float _max_height,
		_float _font_size,
		_int _style_bitmask,
		std::vector<DialoguePageRange>& _out_pages);

private:
	/**
	 * @brief 주어진 범위의 부분 문자열이 영역 안에 들어가는지 검사한다.
	 */
	static _bool FitsInRect(
		const std::wstring& _text,
		_int _start_index,
		_int _end_index,
		_float _max_width,
		_float _max_height,
		_float _font_size,
		_int _style_bitmask);

	/**
	 * @brief 페이지 끝 인덱스를 계산한다.
	 */
	static _int FindPageEndIndex(
		const std::wstring& _text,
		_int _start_index,
		_float _max_width,
		_float _max_height,
		_float _font_size,
		_int _style_bitmask);

	/**
	 * @brief 가능한 경우 공백/개행 기준으로 페이지 끝을 뒤로 당긴다.
	 */
	static _int AdjustEndIndexForWordBoundary(
		const std::wstring& _text,
		_int _start_index,
		_int _end_index);
};