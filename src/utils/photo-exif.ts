/**
 * 照片 EXIF 字段定义（Thymeleaf 表达式）。
 *
 * 展示行（`PhotoExifMeta.astro`）与「是否真的有 EXIF 数据」的判定
 * （`photo.astro` 的 EXIF 面板 / 无 EXIF 占位提示）共用这一份条件：
 * 字段清单只有一处，新增或删除 EXIF 字段不会出现「面板空白但仍判定为有数据」
 * 这类两处漂移的问题。
 *
 * 约定：`condition` 只写字段自身的非空判定，不含 `photo.exif != null` 前缀、
 * 也不含 `${}`，由下面的 helper 统一拼接成完整表达式。
 */

const EXIF_NULL_GUARD = "photo.exif != null";

export interface ExifItem {
  /** 静态占位文本（Thymeleaf 渲染前的原型内容） */
  key: string;
  /** 字段名（Thymeleaf 消息表达式 `#{...}`） */
  label: string;
  /** 取值（Thymeleaf 表达式：`${...}` 或字面量拼接 `|...|`） */
  value: string;
  /** 该字段有值时的 SpEL 判定（不含 null 守卫、不含 `${}`） */
  condition: string;
}

export const exifItems: ExifItem[] = [
  {
    key: "datetime",
    label: "#{page.photos.exif.dateTimeOriginal}",
    value: "${#dates.format(photo.exif.dateTimeOriginal, 'yyyy-MM-dd HH:mm')}",
    condition: "photo.exif.dateTimeOriginal != null",
  },
  {
    key: "camera",
    label: "#{page.photos.exif.camera}",
    value:
      "${#strings.trim((photo.exif.make ?: '') + ' ' + (photo.exif.model ?: ''))}",
    condition:
      "(not #strings.isEmpty(photo.exif.make) or not #strings.isEmpty(photo.exif.model))",
  },
  {
    key: "lens",
    label: "#{page.photos.exif.lens}",
    value: "${photo.exif.lensModel}",
    condition: "not #strings.isEmpty(photo.exif.lensModel)",
  },
  {
    key: "aperture",
    label: "#{page.photos.exif.aperture}",
    value: "|f/${photo.exif.fNumber}|",
    condition: "photo.exif.fNumber != null",
  },
  {
    key: "shutter",
    label: "#{page.photos.exif.shutter}",
    value: "${photo.exif.exposureTime}",
    condition: "not #strings.isEmpty(photo.exif.exposureTime)",
  },
  {
    key: "iso",
    label: "#{page.photos.exif.iso}",
    value: "|ISO ${photo.exif.iso}|",
    condition: "photo.exif.iso != null",
  },
  {
    key: "focal",
    label: "#{page.photos.exif.focalLength}",
    value: "|${photo.exif.focalLength} mm|",
    condition: "photo.exif.focalLength != null",
  },
  {
    key: "focal35",
    label: "#{page.photos.exif.focalLength35mm}",
    value: "|${photo.exif.focalLengthIn35mm} mm|",
    condition: "photo.exif.focalLengthIn35mm != null",
  },
  {
    key: "dimensions",
    label: "#{page.photos.exif.dimensions}",
    value: "|${photo.exif.imageWidth} x ${photo.exif.imageHeight}|",
    condition:
      "(photo.exif.imageWidth != null and photo.exif.imageHeight != null)",
  },
  {
    key: "software",
    label: "#{page.photos.exif.software}",
    value: "${photo.exif.software}",
    condition: "not #strings.isEmpty(photo.exif.software)",
  },
];

/** 单行 EXIF 的渲染条件（th:if 表达式） */
export const exifItemExpr = (item: ExifItem): string =>
  `\${${EXIF_NULL_GUARD} and ${item.condition}}`;

/**
 * 整块 EXIF 是否真的有数据（th:if / th:unless 表达式）。
 * 任一字段有值即视为有数据：`photo.exif` 对象存在但字段全空时按无 EXIF 处理，
 * 页面改显示「此照片无 EXIF」占位提示，避免出现空白面板。
 */
export const exifHasDataExpr = `\${${EXIF_NULL_GUARD} and (${exifItems
  .map((item) => item.condition)
  .join(" or ")})}`;
